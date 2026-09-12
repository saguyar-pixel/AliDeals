import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { generateProductReview, generateTop5Roundup, generateTopNRoundup, generateDealPage } from "@/lib/gemini/content-generator";
import { generateProductJsonLd, generateFaqJsonLd, generateItemListJsonLd } from "@/lib/seo/schema";
import { AliExpressProduct } from "@/lib/aliexpress/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      pageType = "review",
      productId,
      productIds,
      products: directProducts,
      categoryName = "גאדג'טים",
      productData: directProductData,
    } = body;

    const parseJsonSafe = (val: any, fallback: any) => {
      if (!val) return fallback;
      if (typeof val === "object") return val;
      try {
        return JSON.parse(val);
      } catch {
        return fallback;
      }
    };

    if (pageType === "review") {
      const productRecord =
        directProductData ||
        (productId ? jsonDb.getProductById(productId) || jsonDb.getProductByAliId(productId) : null);

      if (!productRecord) {
        return NextResponse.json({ error: "Product not found in database or request" }, { status: 404 });
      }

      const rawGallery = parseJsonSafe(productRecord.galleryImages, [productRecord.mainImage]);
      const galleryList = Array.isArray(rawGallery) ? rawGallery : [productRecord.mainImage];

      const aliProduct: AliExpressProduct = {
        aliId: String(productRecord.aliId),
        originalTitle: productRecord.originalTitle,
        titleHe: productRecord.titleHe || null,
        descriptionHe: productRecord.descriptionHe || null,
        priceUsd: parseFloat(String(productRecord.priceUsd || 0)),
        priceIls: parseFloat(String(productRecord.priceIls || (productRecord.priceUsd ? productRecord.priceUsd * 3.65 : 0))),
        originalPriceUsd: productRecord.originalPriceUsd ? parseFloat(String(productRecord.originalPriceUsd)) : undefined,
        discountPercent: productRecord.discountPercent ? parseInt(String(productRecord.discountPercent), 10) : 0,
        rating: productRecord.rating ? parseFloat(String(productRecord.rating)) : 4.5,
        ordersCount: productRecord.ordersCount ? parseInt(String(productRecord.ordersCount), 10) : 0,
        mainImage: productRecord.mainImage,
        galleryImages: galleryList,
        specifications: parseJsonSafe(productRecord.specifications, {}),
        reviewsSummary: parseJsonSafe(productRecord.reviewsSummary, []),
        aliUrl: productRecord.aliUrl,
        affiliateUrl: productRecord.affiliateUrl || undefined,
      };

      // 1. Generate text content with Gemini
      const reviewContent = await generateProductReview(aliProduct);

      // 2. Default Secondary Image & Alt Text (Replaces old CSS/SVG infographic)
      const secondaryImage = galleryList.length > 1 ? galleryList[1] : aliProduct.mainImage;
      const initialAltText = `${reviewContent.title} - סקירת מפרט רשמית באלי אקספרס`;

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
          infographicImage: secondaryImage,
          infographicAlt: initialAltText,
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
      let aliProducts: AliExpressProduct[] = [];

      if (Array.isArray(directProducts) && directProducts.length > 0) {
        aliProducts = directProducts.map((p: any) => {
          const rawGallery = parseJsonSafe(p.galleryImages, [p.mainImage]);
          const galleryList = Array.isArray(rawGallery) ? rawGallery : [p.mainImage];
          return {
            aliId: String(p.aliId),
            originalTitle: p.originalTitle,
            titleHe: p.titleHe || null,
            descriptionHe: p.descriptionHe || null,
            priceUsd: parseFloat(String(p.priceUsd || 0)),
            priceIls: parseFloat(String(p.priceIls || (p.priceUsd ? p.priceUsd * 3.65 : 0))),
            originalPriceUsd: p.originalPriceUsd ? parseFloat(String(p.originalPriceUsd)) : undefined,
            discountPercent: p.discountPercent ? parseInt(String(p.discountPercent), 10) : 0,
            rating: p.rating ? parseFloat(String(p.rating)) : 4.5,
            ordersCount: p.ordersCount ? parseInt(String(p.ordersCount), 10) : 0,
            mainImage: p.mainImage,
            galleryImages: galleryList,
            specifications: parseJsonSafe(p.specifications, {}),
            reviewsSummary: parseJsonSafe(p.reviewsSummary, []),
            aliUrl: p.aliUrl,
            affiliateUrl: p.affiliateUrl || undefined,
          };
        });
      } else {
        const ids: string[] = productIds || [];
        const allProds = jsonDb.getProducts();
        const productRecords =
          ids.length > 0
            ? allProds.filter((p) => ids.includes(p.id) || ids.includes(p.aliId))
            : allProds.slice(0, 5);

        aliProducts = productRecords.map((p: any) => {
          const rawGallery = parseJsonSafe(p.galleryImages, [p.mainImage]);
          const galleryList = Array.isArray(rawGallery) ? rawGallery : [p.mainImage];
          return {
            aliId: String(p.aliId),
            originalTitle: p.originalTitle,
            titleHe: p.titleHe || null,
            descriptionHe: p.descriptionHe || null,
            priceUsd: parseFloat(String(p.priceUsd || 0)),
            priceIls: parseFloat(String(p.priceIls || (p.priceUsd ? p.priceUsd * 3.65 : 0))),
            originalPriceUsd: p.originalPriceUsd ? parseFloat(String(p.originalPriceUsd)) : undefined,
            discountPercent: p.discountPercent ? parseInt(String(p.discountPercent), 10) : 0,
            rating: p.rating ? parseFloat(String(p.rating)) : 4.5,
            ordersCount: p.ordersCount ? parseInt(String(p.ordersCount), 10) : 0,
            mainImage: p.mainImage,
            galleryImages: galleryList,
            specifications: parseJsonSafe(p.specifications, {}),
            reviewsSummary: parseJsonSafe(p.reviewsSummary, []),
            aliUrl: p.aliUrl,
            affiliateUrl: p.affiliateUrl || undefined,
          };
        });
      }

      if (aliProducts.length < 3) {
        return NextResponse.json({ error: `נדרשים לפחות 3 מוצרים ליצירת עמוד השוואה (נמצאו רק ${aliProducts.length})` }, { status: 400 });
      }

      const topNContent = await generateTopNRoundup(categoryName, aliProducts);

      const itemListSchema = generateItemListJsonLd(
        aliProducts.map((p, idx) => ({
          name: p.titleHe || p.originalTitle,
          url: p.affiliateUrl || p.aliUrl,
          image: p.mainImage,
          position: idx + 1,
        }))
      );

      const faqSchema = generateFaqJsonLd(topNContent.faqs);

      return NextResponse.json({
        success: true,
        pageDraft: {
          slug: topNContent.slug,
          type: "top5",
          title: topNContent.title,
          metaTitle: topNContent.metaTitle,
          metaDescription: topNContent.metaDescription,
          directAnswerGeo: topNContent.directAnswerGeo,
          contentMarkdown: topNContent.contentMarkdown,
          structuredDataJson: JSON.stringify([itemListSchema, faqSchema]),
          featuredImage: aliProducts[0]?.mainImage || "",
          productIds: aliProducts.map((p) => p.aliId),
          targetCategory: categoryName,
          rankings: topNContent.rankings,
          faqs: topNContent.faqs,
          products: aliProducts,
        },
      });
    }

    if (pageType === "deal") {
      const productRecord =
        directProductData ||
        (productId ? jsonDb.getProductById(productId) || jsonDb.getProductByAliId(productId) : null);

      if (!productRecord) {
        return NextResponse.json({ error: "Product not found in database or request" }, { status: 404 });
      }

      const rawGallery = parseJsonSafe(productRecord.galleryImages, [productRecord.mainImage]);
      const galleryList = Array.isArray(rawGallery) ? rawGallery : [productRecord.mainImage];

      const aliProduct: AliExpressProduct = {
        aliId: String(productRecord.aliId),
        originalTitle: productRecord.originalTitle,
        titleHe: productRecord.titleHe || null,
        descriptionHe: productRecord.descriptionHe || null,
        priceUsd: parseFloat(String(productRecord.priceUsd || 0)),
        priceIls: parseFloat(String(productRecord.priceIls || (productRecord.priceUsd ? productRecord.priceUsd * 3.65 : 0))),
        originalPriceUsd: productRecord.originalPriceUsd ? parseFloat(String(productRecord.originalPriceUsd)) : undefined,
        discountPercent: productRecord.discountPercent ? parseInt(String(productRecord.discountPercent), 10) : 40,
        rating: productRecord.rating ? parseFloat(String(productRecord.rating)) : 4.5,
        ordersCount: productRecord.ordersCount ? parseInt(String(productRecord.ordersCount), 10) : 0,
        mainImage: productRecord.mainImage,
        galleryImages: galleryList,
        specifications: parseJsonSafe(productRecord.specifications, {}),
        reviewsSummary: parseJsonSafe(productRecord.reviewsSummary, []),
        aliUrl: productRecord.aliUrl,
        affiliateUrl: productRecord.affiliateUrl || undefined,
      };

      const dealContent = await generateDealPage(aliProduct, categoryName);

      const productSchema = generateProductJsonLd({
        name: dealContent.title,
        description: dealContent.metaDescription,
        image: aliProduct.mainImage,
        sku: aliProduct.aliId,
        price: aliProduct.priceUsd,
        ratingValue: aliProduct.rating,
        reviewCount: aliProduct.ordersCount,
        url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/deals/${dealContent.slug}`,
      });

      const faqSchema = generateFaqJsonLd(dealContent.faqs);

      return NextResponse.json({
        success: true,
        pageDraft: {
          slug: dealContent.slug,
          type: "deal",
          title: dealContent.title,
          metaTitle: dealContent.metaTitle,
          metaDescription: dealContent.metaDescription,
          directAnswerGeo: dealContent.directAnswerGeo,
          contentMarkdown: dealContent.contentMarkdown,
          structuredDataJson: JSON.stringify([productSchema, faqSchema]),
          featuredImage: aliProduct.mainImage,
          productIds: [aliProduct.aliId],
          targetCategory: categoryName,
          faqs: dealContent.faqs,
          dealBadge: dealContent.dealBadge,
          savingsIls: dealContent.savingsIls,
          savingsPercent: dealContent.savingsPercent,
          product: aliProduct,
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
