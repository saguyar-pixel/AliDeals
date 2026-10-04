import { NextRequest, NextResponse } from "next/server";
import { aliExpressApi } from "@/lib/aliexpress/api";
import { fetchAliExpressProduct } from "@/lib/aliexpress";
import { supabaseDb } from "@/lib/db/supabase-db";
import { generateSinglePassReview } from "@/lib/agent/single-pass-controller";
import { sanitizeSlug, verifyAdminAccess } from "@/lib/security/firewall";

export const maxDuration = 60; // Allow sufficient time for API fetching and single-pass review generation

/**
 * Worker / Endpoint for Live Order Ingestion from AliExpress Open Platform API
 * POST /api/affiliate/orders/sync
 * GET /api/affiliate/orders/sync (supports query params for testing / cron)
 */
export async function POST(req: NextRequest) {
  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // empty body
    }

    return await handleOrderSync(req, body);
  } catch (error: any) {
    console.error("Order sync POST error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during order sync" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const daysBack = searchParams.get("daysBack") ? parseInt(searchParams.get("daysBack")!, 10) : undefined;
    let startTime = searchParams.get("startTime") || undefined;
    let endTime = searchParams.get("endTime") || undefined;
    const status = searchParams.get("status") || undefined;
    const pageSize = searchParams.get("pageSize") ? parseInt(searchParams.get("pageSize")!, 10) : undefined;
    const dryRun = searchParams.get("dryRun") === "true";

    if (daysBack && !startTime) {
      const now = new Date();
      const start = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const formatAliTime = (d: Date) =>
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
          d.getMinutes()
        )}:${pad(d.getSeconds())}`;
      startTime = formatAliTime(start);
      endTime = formatAliTime(now);
    }

    return await handleOrderSync(req, { startTime, endTime, status, pageSize, dryRun });
  } catch (error: any) {
    console.error("Order sync GET error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error during order sync" },
      { status: 500 }
    );
  }
}

async function handleOrderSync(req: NextRequest, options: {
  startTime?: string;
  endTime?: string;
  daysBack?: number;
  status?: string;
  pageSize?: number;
  dryRun?: boolean;
}) {
  let effectiveStartTime = options.startTime;
  let effectiveEndTime = options.endTime;

  if (options.daysBack && !effectiveStartTime) {
    const now = new Date();
    const start = new Date(now.getTime() - options.daysBack * 24 * 60 * 60 * 1000);
    const pad = (n: number) => n.toString().padStart(2, "0");
    const formatAliTime = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
        d.getMinutes()
      )}:${pad(d.getSeconds())}`;
    effectiveStartTime = formatAliTime(start);
    effectiveEndTime = formatAliTime(now);
  }
  // 1. Verify API configuration
  if (!aliExpressApi.isConfigured()) {
    return NextResponse.json(
      {
        success: false,
        error: "AliExpress API keys (APP_KEY / APP_SECRET) are missing or not configured.",
      },
      { status: 400 }
    );
  }

  // 2. Fetch live affiliate orders from AliExpress Open Platform Singapore Gateway
  const orderQueryResult = await aliExpressApi.queryAffiliateOrders({
    startTime: effectiveStartTime,
    endTime: effectiveEndTime,
    status: options.status,
    pageSize: options.pageSize || 50,
  });

  const orders = orderQueryResult.orders || [];

  if (orders.length === 0) {
    return NextResponse.json({
      success: true,
      message: `נבדקו הזמנות מול AliExpress API בטווח ${effectiveStartTime} עד ${effectiveEndTime} (סטטוסים: Payment Completed ו-Buyer Confirmed Receipt) אך לא אותרו עסקאות.`,
      queryWindow: {
        startTime: effectiveStartTime,
        endTime: effectiveEndTime,
        status: options.status || "all (Payment Completed + Buyer Confirmed Receipt)",
      },
      stats: {
        totalOrders: 0,
        totalItems: 0,
        existingProductsUpdated: 0,
        newArticlesGenerated: 0,
      },
      orders: [],
    });
  }

  if (options.dryRun) {
    return NextResponse.json({
      success: true,
      dryRun: true,
      totalOrders: orders.length,
      orders,
    });
  }

  // 3. Persist orders & items into Supabase
  const { savedOrders, savedItems, newItems } = await supabaseDb.saveAffiliateOrders(orders);

  let existingProductsUpdated = 0;
  let newArticlesGenerated = 0;
  const processedResults: any[] = [];

  // 4. De-duplication and Intelligent Article Ingestion Pipeline
  for (const order of orders) {
    for (const item of order.items) {
      const cleanAliId = String(item.productId || "").trim();
      if (!cleanAliId) continue;

      // 0. Pre-flight dismissal guard (avoid regenerating dismissed drafts/orders)
      const isDismissed = await supabaseDb.isOrderOrProductDismissed(order.orderNumber, cleanAliId);
      if (isDismissed) {
        if (item.id) {
          await supabaseDb.updateOrderItemStatus(item.id, "dismissed");
        } else {
          await supabaseDb.updateOrderItemStatus(order.orderNumber, "dismissed", undefined, undefined, cleanAliId);
        }
        processedResults.push({
          productId: cleanAliId,
          orderNumber: order.orderNumber,
          action: "skipped_dismissed",
          articleStatus: "dismissed",
        });
        continue;
      }

      // Check if product already exists in DB
      const existingProduct = await supabaseDb.getProductByAliId(cleanAliId);

      if (existingProduct) {
        // === SCENARIO A: Existing Product (De-duplication) ===
        // 1. Increment product sales counter
        await supabaseDb.incrementProductSales(cleanAliId, item.productCount, order.orderTime);

        // 2. Mark item status as 'already_exists' and link product reference
        if (item.id) {
          await supabaseDb.updateOrderItemStatus(
            item.id,
            "already_exists",
            undefined,
            existingProduct.id
          );
        } else {
          await supabaseDb.updateOrderItemStatus(
            order.orderNumber,
            "already_exists",
            undefined,
            existingProduct.id,
            cleanAliId
          );
        }

        existingProductsUpdated++;
        processedResults.push({
          productId: cleanAliId,
          orderNumber: order.orderNumber,
          action: "updated_sales_count",
          articleStatus: "already_exists",
          productTitle: existingProduct.titleHe || existingProduct.originalTitle,
        });

        // Strictly SKIP AI and article generation! Zero token cost.
      } else {
        // === SCENARIO B: New Product ===
        try {
          // 1. Fetch full product specifications & media from AliExpress
          const fullProduct = await fetchAliExpressProduct(cleanAliId);

          // Mark item as 'generating'
          if (item.id) {
            await supabaseDb.updateOrderItemStatus(item.id, "generating", undefined, undefined);
          } else {
            await supabaseDb.updateOrderItemStatus(order.orderNumber, "generating", undefined, undefined, cleanAliId);
          }

          // 2. Trigger Deep AI Review Generator (800-1200 word investigative article + structured metadata)
          const review = await generateSinglePassReview(fullProduct);

          // 3. Insert new product into products table (central catalog) with complete metadata
          const savedProduct = await supabaseDb.upsertProduct({
            aliId: cleanAliId,
            originalTitle: fullProduct.originalTitle,
            titleHe: review.hebrewTitle || fullProduct.titleHe || fullProduct.originalTitle,
            descriptionHe: fullProduct.descriptionHe || review.verdict,
            metaTitle: review.seoTitle || fullProduct.metaTitle,
            metaDescription: review.seoDescription || fullProduct.metaDescription,
            category: fullProduct.category || "אלקטרוניקה וגאדג'טים",
            archetype: review.archetype,
            tags: fullProduct.tags && fullProduct.tags.length > 0 ? fullProduct.tags : [review.hebrewTitle, "אלי אקספרס"],
            priceUsd: fullProduct.priceUsd,
            priceIls: fullProduct.priceIls,
            originalPriceUsd: fullProduct.originalPriceUsd,
            discountPercent: fullProduct.discountPercent,
            rating: fullProduct.rating,
            ordersCount: (fullProduct.ordersCount || 0) + item.productCount,
            mainImage: fullProduct.mainImage,
            galleryImages: fullProduct.galleryImages,
            specifications: fullProduct.specifications || {},
            storeName: fullProduct.storeName,
            sellerPositiveRate: fullProduct.sellerPositiveRate,
            commissionRate: fullProduct.commissionRate,
            aliUrl: fullProduct.aliUrl,
            affiliateUrl: fullProduct.affiliateUrl || fullProduct.aliUrl,
            isEuPlug: review.israelContext.isEuPlug,
            voltage220vCompatible: review.israelContext.voltage220vCompatible,
            sizeWarning: review.israelContext.sizeWarning,
            fabricComposition: review.israelContext.fabricComposition,
            status: "active",
            salesCount: item.productCount,
            lastOrderAt: order.orderTime,
          });

          // 4. Generate unique slug
          const slugCandidate = sanitizeSlug(
            review.hebrewTitle || fullProduct.originalTitle,
            `review-${cleanAliId}`
          );

          // 5. Select infographic media from seller gallery
          const infographicImage = (fullProduct.galleryImages && fullProduct.galleryImages.length > 1)
            ? fullProduct.galleryImages[1]
            : (fullProduct.galleryImages?.[0] || fullProduct.mainImage || null);

          // 6. Find 1-2 complementary products for cross-sell
          let boughtTogetherIds: string[] = [];
          let crossSellReason: string | undefined = undefined;
          try {
            const existingCatalog = await supabaseDb.getProducts();
            const candidates = existingCatalog.filter(
              (p) => p.status === "active" && p.id !== savedProduct.id && p.aliId !== cleanAliId
            );
            const sameArchetype = candidates.filter(
              (p) => (p.archetype && p.archetype === review.archetype) || (p.category && p.category === savedProduct.category)
            );
            const picked = (sameArchetype.length > 0 ? sameArchetype : candidates).slice(0, 2);
            if (picked.length > 0) {
              boughtTogetherIds = picked.map((p) => p.id || p.aliId);
              crossSellReason = `רוכשים רבים שבחרו ב-${review.hebrewTitle || savedProduct.titleHe} שילבו בהזמנה גם ${picked.map((p) => p.titleHe || p.originalTitle).join(" וכן ")} להשלמת החבילה.`;
            }
          } catch (e) {
            console.warn("Notice picking complementary products:", e);
          }

          // 7. Build rich Schema.org JSON-LD graph
          const richSchema = {
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Product",
                "name": review.hebrewTitle || fullProduct.titleHe || fullProduct.originalTitle,
                "image": fullProduct.mainImage,
                "description": review.seoDescription || fullProduct.metaDescription,
                "offers": {
                  "@type": "Offer",
                  "price": String(fullProduct.priceUsd || "0"),
                  "priceCurrency": "USD",
                  "availability": "https://schema.org/InStock",
                  "url": fullProduct.affiliateUrl || fullProduct.aliUrl,
                },
                "aggregateRating": {
                  "@type": "AggregateRating",
                  "ratingValue": String(fullProduct.rating || "4.8"),
                  "reviewCount": String(fullProduct.ordersCount || "100"),
                },
                "review": {
                  "@type": "Review",
                  "reviewRating": {
                    "@type": "Rating",
                    "ratingValue": String(fullProduct.rating || "4.8"),
                    "bestRating": "5",
                  },
                  "author": {
                    "@type": "Organization",
                    "name": "צוות המומחים של AliDeals",
                  },
                },
              },
              {
                "@type": "BreadcrumbList",
                "itemListElement": [
                  {
                    "@type": "ListItem",
                    "position": 1,
                    "name": "עמוד הבית",
                    "item": "https://ali-deals.co.il",
                  },
                  {
                    "@type": "ListItem",
                    "position": 2,
                    "name": "סקירות מוצרים",
                    "item": "https://ali-deals.co.il/#reviews",
                  },
                  {
                    "@type": "ListItem",
                    "position": 3,
                    "name": review.hebrewTitle || fullProduct.titleHe || fullProduct.originalTitle,
                    "item": `https://ali-deals.co.il/reviews/${slugCandidate}`,
                  },
                ],
              },
              {
                "@type": "FAQPage",
                "mainEntity": (review.faqs && review.faqs.length > 0 ? review.faqs : [
                  {
                    question: "האם יש תשלום מכס נוסף בהגעה לישראל?",
                    answer: review.israelContext.taxNotes || (fullProduct.priceUsd < 75 ? "לא, פטור מלא ממכס ומע\"מ מתחת ל-75$." : "מחיר המוצר מעל 75$, לכן ייתכן חיוב במע\"מ (17%)."),
                  },
                  {
                    question: "כמה זמן לוקח לחבילה להגיע לישראל?",
                    answer: "במשלוח AliExpress Standard Shipping, זמן ההגעה הממוצע עומד על 7 עד 14 ימי עסקים.",
                  },
                  {
                    question: "איזה שקע חשמל מומלץ לבחור בהזמנה?",
                    answer: review.israelContext.isEuPlug ? "מומלץ לבחור תמיד בתקע EU (אירופאי) התואם לשקעים בישראל." : "מומלץ לבדוק את התאמת התקע והמתח במפרט המוצר.",
                  },
                ]).map((f: any) => ({
                  "@type": "Question",
                  "name": f.question,
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": f.answer,
                  },
                })),
              },
            ],
          };
          const structuredDataJson = JSON.stringify(richSchema);

          // 8. Create review page as DRAFT with all rich fields
          const savedPage = await supabaseDb.upsertPage({
            slug: slugCandidate,
            type: "review",
            title: review.hebrewTitle,
            metaTitle: review.seoTitle,
            metaDescription: review.seoDescription,
            directAnswerGeo: review.verdict,
            contentMarkdown: review.mainReview,
            pros: review.pros,
            cons: review.cons,
            faqs: review.faqs,
            archetype: review.archetype,
            targetCategory: fullProduct.category || "אלקטרוניקה וגאדג'טים",
            tags: fullProduct.tags && fullProduct.tags.length > 0 ? fullProduct.tags : [review.hebrewTitle, "אלי אקספרס"],
            isEuPlug: review.israelContext.isEuPlug,
            voltage220vCompatible: review.israelContext.voltage220vCompatible,
            sizeWarning: review.israelContext.sizeWarning,
            fabricComposition: review.israelContext.fabricComposition,
            productIds: JSON.stringify([savedProduct.id, cleanAliId]),
            featuredImage: fullProduct.mainImage,
            infographicImage,
            boughtTogetherIds,
            crossSellReason,
            structuredDataJson,
            status: "draft", // Saved as draft -> enqueued in CMS approval queue!
          });

          // 9. Link product to page in page_products relational junction table
          await supabaseDb.setPageProducts(savedPage.id, [
            {
              productId: savedProduct.id,
              position: 1,
              badge: "רכישה מאומתת בלייב",
              pros: review.pros,
              cons: review.cons,
              customReview: review.verdict,
            },
          ]);

          // 10. Update order item status as 'completed'
          if (item.id) {
            await supabaseDb.updateOrderItemStatus(
              item.id,
              "completed",
              savedPage.slug || savedPage.id,
              savedProduct.id
            );
          } else {
            await supabaseDb.updateOrderItemStatus(
              order.orderNumber,
              "completed",
              savedPage.slug || savedPage.id,
              savedProduct.id,
              cleanAliId
            );
          }

          newArticlesGenerated++;
          processedResults.push({
            productId: cleanAliId,
            orderNumber: order.orderNumber,
            action: "generated_draft_review",
            articleStatus: "completed",
            pageSlug: savedPage.slug,
            pageTitle: savedPage.title,
          });
        } catch (err: any) {
          console.error(`Error processing new product ${cleanAliId}:`, err);
          if (item.id) {
            await supabaseDb.updateOrderItemStatus(item.id, "failed");
          } else {
            await supabaseDb.updateOrderItemStatus(order.orderNumber, "failed", undefined, undefined, cleanAliId);
          }
          processedResults.push({
            productId: cleanAliId,
            orderNumber: order.orderNumber,
            action: "failed",
            error: err.message,
          });
        }
      }
    }
  }

  return NextResponse.json({
    success: true,
    message: `סנכרון הזמנות הושלם בהצלחה: ${savedOrders} הזמנות נשמרו, ${existingProductsUpdated} מוצרים עודכנו במאגר, ${newArticlesGenerated} סקירות חדשות הופקו וממתינות לאישור.`,
    stats: {
      totalOrders: savedOrders,
      totalItems: savedItems,
      existingProductsUpdated,
      newArticlesGenerated,
    },
    results: processedResults,
  });
}
