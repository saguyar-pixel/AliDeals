import { fetchAliExpressProduct } from "../aliexpress";
import { generateProductReview } from "../gemini/content-generator";
import { generateHebrewInfographicSvg } from "../gemini/image-studio";
import { generateProductJsonLd, generateFaqJsonLd } from "../seo/schema";
import { jsonDb } from "../db";
import { safeGitCommitAndPush } from "../security/safe-git";
import { validateAndSanitizeAliExpressUrl, sanitizeSlug } from "../security/firewall";

export interface AutonomousJobResult {
  success: boolean;
  slug?: string;
  title?: string;
  publicUrl?: string;
  infographicSvg?: string;
  priceIls?: number;
  priceUsd?: number;
  error?: string;
}

/**
 * Hardened Autonomous pipeline:
 * Validates URL (SSRF Guard) -> Scrapes -> Generates -> Saves -> Safe Git Push (RCE Proof)
 */
export async function runAutonomousReviewPipeline(
  urlOrId: string,
  category = "אלקטרוניקה וגאדג'טים"
): Promise<AutonomousJobResult> {
  try {
    // 1. Security Check: SSRF Guard & Whitelist validation
    const urlCheck = validateAndSanitizeAliExpressUrl(urlOrId);
    if (!urlCheck.isValid || !urlCheck.sanitizedUrl) {
      return { success: false, error: `אבטחה: ${urlCheck.error || "קישור לא חוקי"}` };
    }

    console.log(`[Agent Secure] מתחיל עיבוד מוצר מאומת מאלי אקספרס: ${urlCheck.sanitizedUrl}`);

    // 2. Fetch raw product data via Dual Engine
    const product = await fetchAliExpressProduct(urlCheck.sanitizedUrl);

    // 3. Upsert into products database
    jsonDb.upsertProduct({
      id: `prod_${product.aliId}`,
      aliId: product.aliId,
      originalTitle: product.originalTitle,
      titleHe: product.titleHe || null,
      descriptionHe: product.descriptionHe || null,
      priceUsd: product.priceUsd,
      priceIls: product.priceIls,
      originalPriceUsd: product.originalPriceUsd || null,
      discountPercent: product.discountPercent,
      rating: product.rating,
      ordersCount: product.ordersCount,
      storeName: product.storeName || null,
      commissionRate: product.commissionRate || 7.0,
      mainImage: product.mainImage,
      galleryImages: JSON.stringify(product.galleryImages),
      specifications: JSON.stringify(product.specifications),
      reviewsSummary: JSON.stringify(product.reviewsSummary),
      aliUrl: product.aliUrl,
      affiliateUrl: product.affiliateUrl || null,
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 4. Generate Hebrew content via Gemini
    const reviewContent = await generateProductReview(product);
    const safeSlug = sanitizeSlug(reviewContent.slug);

    // 5. Generate Hebrew Infographic SVG
    const infographicSvg = generateHebrewInfographicSvg({
      title: reviewContent.title,
      badge: "סקירה מומלצת 2026",
      priceIls: product.priceIls,
      priceUsd: product.priceUsd,
      rating: product.rating,
      ordersCount: product.ordersCount,
      features: reviewContent.pros,
      taxBadge: reviewContent.israelContext.taxNotes,
      productImageUrl: product.mainImage,
    });

    // 6. Generate Schema.org
    const productSchema = generateProductJsonLd({
      name: reviewContent.title,
      description: reviewContent.metaDescription,
      image: product.mainImage,
      sku: product.aliId,
      price: product.priceUsd,
      ratingValue: product.rating,
      reviewCount: product.ordersCount,
      url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://alideals.co.il"}/reviews/${safeSlug}`,
    });
    const faqSchema = generateFaqJsonLd(reviewContent.faqs);

    // 7. Save page record
    const now = new Date().toISOString();
    jsonDb.upsertPage({
      id: `page_${Date.now()}`,
      slug: safeSlug,
      type: "review",
      title: reviewContent.title,
      metaTitle: reviewContent.metaTitle,
      metaDescription: reviewContent.metaDescription,
      directAnswerGeo: reviewContent.directAnswerGeo,
      contentMarkdown: reviewContent.contentMarkdown,
      structuredDataJson: JSON.stringify([productSchema, faqSchema]),
      featuredImage: product.mainImage,
      infographicImage: infographicSvg,
      targetCategory: category,
      productIds: JSON.stringify([product.aliId]),
      status: "published",
      viewsCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // 8. Safe Git Push without command injection vulnerability
    console.log(`[Agent Secure] דוחף שינויים ל-GitHub בצורה מאובטחת...`);
    const gitResult = await safeGitCommitAndPush(`Autonomous Agent: published ${safeSlug}`);
    if (gitResult.success) {
      console.log(`[Agent Secure] השינויים נדחפו בהצלחה ל-GitHub Pages.`);
    }

    return {
      success: true,
      slug: safeSlug,
      title: reviewContent.title,
      priceIls: product.priceIls,
      priceUsd: product.priceUsd,
      publicUrl: `/reviews/${safeSlug}`,
      infographicSvg,
    };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Agent Error]:`, msg);
    return { success: false, error: msg };
  }
}
