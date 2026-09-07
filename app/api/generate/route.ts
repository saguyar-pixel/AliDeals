import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { generateProductReview, generateTop5Roundup } from "@/lib/gemini/content-generator";
import { generateHebrewInfographicSvg } from "@/lib/gemini/image-studio";
import { generateProductJsonLd, generateFaqJsonLd, generateItemListJsonLd } from "@/lib/seo/schema";
import { AliExpressProduct } from "@/lib/aliexpress/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pageType = "review", productId, productIds, categoryName = "גאדג'טים" } = body;

    if (pageType === "review") {
      if (!productId) {
        return NextResponse.json({ error: "Missing productId for review generation" }, { status: 400 });
      }

      const productRecord = jsonDb.getProductById(productId) || jsonDb.getProductByAliId(productId);
      if (!productRecord) {
        return NextResponse.json({ error: "Product not found in database" }, { status: 404 });
      }

      const aliProduct: AliExpressProduct = {
        aliId: productRecord.aliId,
        originalTitle: productRecord.originalTitle,
        priceUsd: productRecord.priceUsd,
        priceIls: productRecord.priceIls,
        originalPriceUsd: productRecord.originalPriceUsd || undefined,
        discountPercent: productRecord.discountPercent || 0,
        rating: productRecord.rating || 4.5,
        ordersCount: productRecord.ordersCount || 0,
        mainImage: productRecord.mainImage,
        galleryImages: JSON.parse(productRecord.galleryImages || "[]"),
        specifications: JSON.parse(productRecord.specifications || "{}"),
        reviewsSummary: JSON.parse(productRecord.reviewsSummary || "[]"),
        aliUrl: productRecord.aliUrl,
        affiliateUrl: productRecord.affiliateUrl || undefined,
      };

      // 1. Generate text content with Gemini
      const reviewContent = await generateProductReview(aliProduct);

      // 2. Generate Hebrew Infographic SVG
      const infographicSvg = generateHebrewInfographicSvg({
        title: reviewContent.title,
        badge: "סקירה מומלצת 2026",
        priceIls: aliProduct.priceIls,
        priceUsd: aliProduct.priceUsd,
        rating: aliProduct.rating,
        ordersCount: aliProduct.ordersCount,
        features: reviewContent.pros,
        taxBadge: reviewContent.israelContext.taxNotes,
        productImageUrl: aliProduct.mainImage,
      });

      // 3. Generate structured schema.org
      const productSchema = generateProductJsonLd({
        name: reviewContent.title,
        description: reviewContent.metaDescription,
        image: aliProduct.mainImage,
        sku: aliProduct.aliId,
        price: aliProduct.priceUsd,
        ratingValue: aliProduct.rating,
        reviewCount: aliProduct.ordersCount,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reviews/${reviewContent.slug}`,
      });

      const faqSchema = generateFaqJsonLd(reviewContent.faqs);
      const combinedSchemas = JSON.stringify([productSchema, faqSchema]);

      return NextResponse.json({
        success: true,
        pageDraft: {
          slug: reviewContent.slug,
          type: "review",
          title: reviewContent.title,
          metaTitle: reviewContent.metaTitle,
          metaDescription: reviewContent.metaDescription,
          directAnswerGeo: reviewContent.directAnswerGeo,
          contentMarkdown: reviewContent.contentMarkdown,
          structuredDataJson: combinedSchemas,
          featuredImage: aliProduct.mainImage,
          infographicSvg: infographicSvg,
          productIds: [aliProduct.aliId],
          targetCategory: categoryName,
          pros: reviewContent.pros,
          cons: reviewContent.cons,
          faqs: reviewContent.faqs,
          israelContext: reviewContent.israelContext,
          product: aliProduct,
        },
      });
    }

    if (pageType === "top5") {
      const ids: string[] = productIds || [];
      const allProds = jsonDb.getProducts();
      const productRecords =
        ids.length > 0
          ? allProds.filter((p) => ids.includes(p.id) || ids.includes(p.aliId))
          : allProds.slice(0, 5);

      const aliProducts: AliExpressProduct[] = productRecords.map((p) => ({
        aliId: p.aliId,
        originalTitle: p.originalTitle,
        priceUsd: p.priceUsd,
        priceIls: p.priceIls,
        originalPriceUsd: p.originalPriceUsd || undefined,
        discountPercent: p.discountPercent || 0,
        rating: p.rating || 4.5,
        ordersCount: p.ordersCount || 0,
        mainImage: p.mainImage,
        galleryImages: JSON.parse(p.galleryImages || "[]"),
        specifications: JSON.parse(p.specifications || "{}"),
        reviewsSummary: JSON.parse(p.reviewsSummary || "[]"),
        aliUrl: p.aliUrl,
        affiliateUrl: p.affiliateUrl || undefined,
      }));

      const top5Content = await generateTop5Roundup(categoryName, aliProducts);

      const itemListSchema = generateItemListJsonLd(
        aliProducts.map((p, idx) => ({
          name: p.originalTitle,
          url: p.affiliateUrl || p.aliUrl,
          image: p.mainImage,
          position: idx + 1,
        }))
      );

      const faqSchema = generateFaqJsonLd(top5Content.faqs);

      return NextResponse.json({
        success: true,
        pageDraft: {
          slug: top5Content.slug,
          type: "top5",
          title: top5Content.title,
          metaTitle: top5Content.metaTitle,
          metaDescription: top5Content.metaDescription,
          directAnswerGeo: top5Content.directAnswerGeo,
          contentMarkdown: top5Content.contentMarkdown,
          structuredDataJson: JSON.stringify([itemListSchema, faqSchema]),
          featuredImage: aliProducts[0]?.mainImage || "",
          productIds: aliProducts.map((p) => p.aliId),
          targetCategory: categoryName,
          rankings: top5Content.rankings,
          faqs: top5Content.faqs,
          products: aliProducts,
        },
      });
    }

    return NextResponse.json({ error: `Unsupported page type: ${pageType}` }, { status: 400 });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Generation failed";
    console.error("Gemini Generation API Error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
