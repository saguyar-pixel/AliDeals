import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { supabaseDb, PageRecord, ProductRecord } from "@/lib/db";
import MarkdownContent from "@/components/MarkdownContent";
import ProsConsBox from "@/components/ProsConsBox";
import FaqAccordion from "@/components/FaqAccordion";
import ArticleInteractions from "@/components/articles/ArticleInteractions";
import { BookOpen, Calendar, Clock, ChevronLeft, Sparkles, Tag, ArrowRight, ShieldCheck } from "lucide-react";

export const revalidate = 900; // ISR — רענון כל 15 דקות
export const dynamicParams = true;

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await supabaseDb.getPageBySlug(slug);

  if (!page) {
    return { title: "מאמר לא נמצא | AliDeals" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const canonicalUrl = `${baseUrl}/articles/${page.slug}`;
  const ogImage = page.featuredImage || `${baseUrl}/og-image.jpg`;

  const metaTitle = page.metaTitle || page.title || "מדריך קנייה ומאמר צרכנות | AliDeals";
  const metaDescription =
    page.metaDescription ||
    page.directAnswerGeo ||
    "מדריכי צרכנות, סקירות עומק וטיפים לקנייה חכמה באלי אקספרס מבית AliDeals ישראל.";

  return {
    title: `${metaTitle} | AliDeals`,
    description: metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: metaTitle,
      description: metaDescription,
      url: canonicalUrl,
      siteName: "AliDeals ישראל",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
      type: "article",
      locale: "he_IL",
      publishedTime: page.createdAt ? new Date(page.createdAt).toISOString() : undefined,
      modifiedTime: page.updatedAt ? new Date(page.updatedAt).toISOString() : undefined,
      authors: ["רוֹן - סוכן הצרכנות של AliDeals"],
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [ogImage],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const page = await supabaseDb.getPageBySlug(slug);

  // Zero 404 Resilience: Check 301 redirects if page is not found or not published
  if (!page || page.status !== "published") {
    let redirectRule = null;
    try {
      redirectRule = await supabaseDb.getRedirectBySource(`/articles/${slug}`);
    } catch {
      // Ignore redirect lookup errors
    }
    redirect(redirectRule ? redirectRule.targetPath : "/articles");
  }

  // Load products to support embedded product cards ([product:ID])
  let allProducts: ProductRecord[] = [];
  try {
    allProducts = await supabaseDb.getProducts();
  } catch (err) {
    console.warn("Failed to load products for article page:", err);
  }

  // Calculate reading time and extract TOC
  const markdown = page.contentMarkdown || "";
  const wordsCount = markdown.split(/\s+/).filter(Boolean).length;
  const readingTimeMinutes = Math.max(2, Math.ceil(wordsCount / 180));

  // Extract Table of Contents
  const lines = markdown.split(/\r?\n/);
  const toc: { id: string; text: string; level: number }[] = [];
  let headerIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("## ")) {
      const text = trimmed.slice(3).replace(/[*_`]/g, "").trim();
      toc.push({ id: `sec-${headerIndex++}`, text, level: 2 });
    } else if (trimmed.startsWith("### ")) {
      const text = trimmed.slice(4).replace(/[*_`]/g, "").trim();
      toc.push({ id: `sec-${headerIndex++}`, text, level: 3 });
    }
  }

  // Format date
  const updatedDate = page.updatedAt
    ? new Date(page.updatedAt).toLocaleDateString("he-IL", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "עדכני לשנת 2026";

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const canonicalUrl = `${baseUrl}/articles/${page.slug}`;

  // Fetch related articles
  let relatedArticles: PageRecord[] = [];
  try {
    const allPages = await supabaseDb.getPages();
    relatedArticles = allPages
      .filter(
        (p) =>
          p.id !== page.id &&
          p.status === "published" &&
          (p.type === "article" || p.type === "guide" || p.type === "top5")
      )
      .slice(0, 3);
  } catch {
    // Graceful fallback
  }

  // Structured Data: Schema.org Article & BreadcrumbList
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: page.title,
    description: page.metaDescription || page.directAnswerGeo,
    image: page.featuredImage ? [page.featuredImage] : undefined,
    datePublished: page.createdAt ? new Date(page.createdAt).toISOString() : new Date().toISOString(),
    dateModified: page.updatedAt ? new Date(page.updatedAt).toISOString() : new Date().toISOString(),
    author: {
      "@type": "Person",
      name: "רוֹן - סוכן הצרכנות הראשי",
      jobTitle: "עורך וסוקר טכנולוגיה",
      url: baseUrl,
    },
    publisher: {
      "@type": "Organization",
      name: "AliDeals ישראל",
      url: baseUrl,
      logo: {
        "@type": "ImageObject",
        url: `${baseUrl}/icon.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": canonicalUrl,
    },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "דף הבית",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "מדריכים ומאמרים",
        item: `${baseUrl}/articles`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: page.title,
        item: canonicalUrl,
      },
    ],
  };

  return (
    <article className="min-h-screen bg-white text-slate-900 pb-16" dir="rtl">
      {/* Schema.org Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />

      {/* Floating progress, TOC & Sharing */}
      <ArticleInteractions title={page.title} url={canonicalUrl} toc={toc} />

      {/* Header Container */}
      <div className="bg-slate-50 border-b border-slate-200/70 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          {/* Breadcrumbs */}
          <nav aria-label="פירורי לחם" className="flex items-center gap-2 text-xs text-slate-500 mb-4 flex-wrap">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              דף הבית
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/articles" className="hover:text-slate-900 transition-colors">
              מדריכים ומאמרים
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold truncate max-w-[200px] sm:max-w-xs">
              {page.title}
            </span>
          </nav>

          {/* Meta Badges */}
          <div className="flex items-center gap-3 text-xs text-slate-600 mb-3 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-indigo-100/80 text-indigo-700 font-extrabold flex items-center gap-1">
              <Tag className="w-3 h-3" />
              <span>{page.targetCategory || "מדריך צרכנות"}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <Calendar className="w-3.5 h-3.5" />
              <span>עודכן: {updatedDate}</span>
            </span>
            <span className="flex items-center gap-1 text-slate-500 font-medium">
              <Clock className="w-3.5 h-3.5" />
              <span>קריאה: כ-{readingTimeMinutes} דקות</span>
            </span>
          </div>

          {/* H1 Main Title */}
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-950 tracking-tight leading-tight mb-4">
            {page.title}
          </h1>

          {/* Direct Answer Geo / Lead Paragraph */}
          {page.directAnswerGeo && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs text-slate-800 text-sm sm:text-base leading-relaxed">
              <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>תמצית המדריך בקצרה:</span>
              </div>
              <p className="font-medium text-slate-800">{page.directAnswerGeo}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10">
        {/* Featured Cover Image */}
        {page.featuredImage && (
          <div className="mb-8 rounded-3xl overflow-hidden shadow-sm border border-slate-200 bg-slate-100 aspect-16/9 relative">
            <img
              src={page.featuredImage}
              alt={page.title}
              className="w-full h-full object-cover"
              loading="eager"
            />
          </div>
        )}

        {/* Israeli Shopper Compliance Bar */}
        {(page.isEuPlug !== null ||
          page.voltage220vCompatible !== null ||
          Boolean(page.sizeWarning) ||
          Boolean(page.fabricComposition)) && (
          <div className="mb-8 p-4 sm:p-5 rounded-2xl bg-amber-50/70 border border-amber-200/90 text-xs sm:text-sm text-slate-800 shadow-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900 mb-2">
              <ShieldCheck className="w-4 h-4 text-amber-600" />
              <span>דגשים חשובים לקונים בישראל:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-slate-700">
              {page.isEuPlug !== null && page.isEuPlug !== undefined && (
                <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-base">🔌</span>
                  <span>
                    <strong>תקע חשמלי: </strong>
                    {page.isEuPlug ? "תקע אירופאי (EU Plug) תואם לישראל" : "נדרש מתאם לשקע ישראלי"}
                  </span>
                </div>
              )}
              {page.voltage220vCompatible !== null && page.voltage220vCompatible !== undefined && (
                <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100">
                  <span className="text-base">⚡</span>
                  <span>
                    <strong>מתח עבודה: </strong>
                    {page.voltage220vCompatible ? "תואם לרשת החשמל בישראל (220V/50Hz)" : "יש לוודא תאימות מתח"}
                  </span>
                </div>
              )}
              {page.sizeWarning && (
                <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100 sm:col-span-2">
                  <span className="text-base">📏</span>
                  <span>
                    <strong>סרגל מידות: </strong>
                    {page.sizeWarning}
                  </span>
                </div>
              )}
              {page.fabricComposition && (
                <div className="flex items-center gap-2 bg-white/90 p-2.5 rounded-xl border border-amber-100 sm:col-span-2">
                  <span className="text-base">🧶</span>
                  <span>
                    <strong>הרכב בד וחומרים: </strong>
                    {page.fabricComposition}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pros & Cons Box (if present) */}
        {((page.pros && page.pros.length > 0) || (page.cons && page.cons.length > 0)) && (
          <div className="mb-8">
            <ProsConsBox pros={page.pros || []} cons={page.cons || []} />
          </div>
        )}

        {/* Article Body */}
        <div className="text-slate-800 text-base sm:text-lg leading-relaxed space-y-6">
          <MarkdownContent
            content={page.contentMarkdown}
            products={allProducts}
            className="prose-slate max-w-none"
          />
        </div>

        {/* Recommended Products Showcase (if present in productIds) */}
        {(() => {
          let recIds: string[] = [];
          try {
            recIds = Array.isArray(page.productIds)
              ? page.productIds
              : typeof page.productIds === "string"
              ? JSON.parse(page.productIds || "[]")
              : [];
          } catch {}

          const recItems = recIds
            .map((id) => {
              const found = allProducts.find(
                (p) =>
                  String(p.id) === String(id) ||
                  String(p.aliId) === String(id) ||
                  String(p.ali_product_id) === String(id)
              );
              if (found) {
                return {
                  id: found.id,
                  title: found.titleHe || found.title || found.originalTitle,
                  priceIls: found.priceIls || Math.round((found.priceUsd || 0) * 3.65),
                  image: found.mainImage || "/placeholder-product.png",
                  aliId: found.aliId || id,
                  slug: found.slug || found.id,
                  isCatalog: true,
                };
              }
              // Support direct AliExpress items provided by user/admin
              return {
                id,
                title: `מוצר אלי אקספרס מומלץ (פריט #${id})`,
                priceIls: null,
                image: "/placeholder-product.png",
                aliId: id,
                slug: null,
                isCatalog: false,
              };
            })
            .filter(Boolean);

          if (recItems.length === 0) return null;

          return (
            <div className="mt-12 p-6 rounded-3xl bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-black text-slate-900">מוצרים מומלצים ומבצעים שסקרנו במדריך</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {recItems.map((prod) => (
                  <div
                    key={prod.id}
                    className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex items-center gap-3.5"
                  >
                    <img
                      src={prod.image}
                      alt={prod.title}
                      className="w-16 h-16 object-contain rounded-xl bg-slate-50 border border-slate-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{prod.title}</h4>
                      {prod.priceIls ? (
                        <div className="text-sm font-black text-slate-950 mt-1">
                          ₪{prod.priceIls}
                        </div>
                      ) : (
                        <div className="text-xs font-semibold text-amber-700 mt-1">
                          בדקו מחיר עדכני באלי אקספרס
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <a
                          href={`/go/${prod.aliId}?sub_id=article_rec`}
                          target="_blank"
                          rel="sponsored nofollow noopener noreferrer"
                          className="px-3 py-1 rounded-lg bg-ali-600 hover:bg-ali-700 text-white text-[11px] font-bold shadow-xs transition-colors"
                        >
                          קנה באלי אקספרס
                        </a>
                        {prod.isCatalog && prod.slug && (
                          <Link
                            href={`/reviews/${prod.slug}`}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-colors"
                          >
                            סקירה מלאה
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Tags */}
        {page.tags && page.tags.length > 0 && (
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-400">תגיות:</span>
            {page.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition-colors"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* FAQs Section */}
        {page.faqs && page.faqs.length > 0 && (
          <div className="mt-10">
            <FaqAccordion items={page.faqs} title="שאלות נפוצות ותשובות לקונים בישראל (FAQ)" />
          </div>
        )}

        {/* Author Bio Box */}
        <div className="mt-12 p-6 rounded-3xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center sm:items-start gap-4 text-center sm:text-right">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-ali-600 to-indigo-600 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-md">
            רוֹן
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <h3 className="font-extrabold text-slate-900 text-base">רוֹן</h3>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                <span>מומחה צרכנות ורכש בסין</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              סוכן הצרכנות הבכיר של AliDeals. בודק מוצרים, חוקר תקנות מכס, משווה מחירי דילים ומאתר קופונים שווים עבור קונים ישראלים באלי אקספרס.
            </p>
          </div>
        </div>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <div className="mt-16 pt-10 border-t border-slate-200">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              <span>מדריכים נוספים שאולי יעניינו אותך</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {relatedArticles.map((rel) => {
                const relUrl =
                  rel.type === "article" || rel.type === "guide"
                    ? `/articles/${rel.slug}`
                    : rel.type === "top5"
                    ? `/top5/${rel.slug}`
                    : `/reviews/${rel.slug}`;

                return (
                  <Link
                    key={rel.id}
                    href={relUrl}
                    className="group bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md hover:border-indigo-300 transition-all flex flex-col"
                  >
                    <div className="aspect-16/10 bg-slate-100 overflow-hidden relative">
                      {rel.featuredImage ? (
                        <img
                          src={rel.featuredImage}
                          alt={rel.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-indigo-50 to-slate-100 text-slate-400">
                          <BookOpen className="w-8 h-8 opacity-40" />
                        </div>
                      )}
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 uppercase">
                          {rel.targetCategory || "מדריך"}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                          {rel.title}
                        </h4>
                      </div>
                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-indigo-600 font-bold">
                        <span>קרא עוד</span>
                        <ChevronLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
