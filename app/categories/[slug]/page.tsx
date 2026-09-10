import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { jsonDb, PageRecord, ProductRecord } from "@/lib/db";
import { safeReadJson } from "@/lib/agent/storage-helper";
import { ChevronLeft, ArrowLeft, Star, ShieldCheck, Tag, Sparkles, Award } from "lucide-react";

interface CategoryItem {
  id: string;
  slug: string;
  nameHe: string;
  icon?: string;
  descriptionHe?: string;
  tags?: string[];
}

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const categories = safeReadJson<CategoryItem[]>("categories.json", []);
  return categories.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categories = safeReadJson<CategoryItem[]>("categories.json", []);
  const category = categories.find((c) => c.slug === slug || encodeURIComponent(c.nameHe) === slug);

  if (!category) {
    return { title: "קטגוריה לא נמצאה" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const canonicalUrl = `${baseUrl}/categories/${category.slug}`;

  return {
    title: `${category.icon || "🏷️"} ${category.nameHe} - סקירות, דילים והשוואות TOP 5`,
    description: category.descriptionHe || `ריכוז כל המוצרים, הסקירות וההשוואות המומלצות באלי אקספרס לקטגוריית ${category.nameHe}. בדיקת מכס ($75) ומשלוח לישראל.`,
    alternates: { canonical: canonicalUrl },
    openGraph: {
      title: `${category.icon || "🏷️"} ${category.nameHe} - סקירות ודילים | AliDeals`,
      description: category.descriptionHe,
      url: canonicalUrl,
      siteName: "AliDeals ישראל",
      locale: "he_IL",
      type: "website",
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categories = safeReadJson<CategoryItem[]>("categories.json", []);
  const category = categories.find(
    (c) => c.slug === slug || encodeURIComponent(c.nameHe) === slug || c.nameHe === decodeURIComponent(slug)
  );

  if (!category) {
    notFound();
  }

  // Fetch relevant reviews & top5 guides
  const allReviews = jsonDb.getPagesByType("review");
  const allTop5 = jsonDb.getPagesByType("top5");
  const allProducts = jsonDb.getAllProducts().filter((p) => p.status !== "inactive");

  const categoryReviews = allReviews.filter(
    (r) => r.targetCategory === category.nameHe || r.targetCategory?.includes(category.nameHe)
  );

  const categoryTop5 = allTop5.filter(
    (t) => t.targetCategory === category.nameHe || t.targetCategory?.includes(category.nameHe)
  );

  const categoryProducts = allProducts.filter(
    (p) => p.category === category.nameHe || (category.tags && p.tags?.some((t) => category.tags?.includes(t)))
  );

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category.nameHe} - AliDeals ישראל`,
    "description": category.descriptionHe,
    "url": `${baseUrl}/categories/${category.slug}`,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "עמוד הבית", "item": baseUrl },
        { "@type": "ListItem", "position": 2, "name": "קטגוריות", "item": `${baseUrl}/#categories` },
        { "@type": "ListItem", "position": 3, "name": category.nameHe, "item": `${baseUrl}/categories/${category.slug}` },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionSchema) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-24" dir="rtl">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            ראשי
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-semibold truncate">{category.nameHe}</span>
        </nav>

        {/* Hero Header */}
        <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-8 sm:p-12 shadow-xl border border-slate-800 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-ali-400">
            <span>{category.icon || "🏷️"}</span>
            <span>קטגוריה רשמית</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
            {category.nameHe}
          </h1>

          <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
            {category.descriptionHe}
          </p>

          {/* Quick Tag Pills */}
          {category.tags && category.tags.length > 0 && (
            <div className="pt-2 flex flex-wrap gap-2">
              {category.tags.map((t) => (
                <Link
                  key={t}
                  href={`/tags/${encodeURIComponent(t)}`}
                  className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 transition-colors"
                >
                  <Tag className="w-3 h-3 text-ali-400" />
                  <span>#{t}</span>
                </Link>
              ))}
            </div>
          )}
        </header>

        {/* Section 1: TOP 5 Guides (if available) */}
        {categoryTop5.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Award className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                טבלאות השוואה ו-TOP 5
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {categoryTop5.map((page) => (
                <div
                  key={page.id}
                  className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all space-y-4 group"
                >
                  <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                    טבלת TOP 5
                  </span>
                  <h3 className="font-bold text-lg text-slate-900 group-hover:text-indigo-600 transition-colors">
                    {page.title}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {page.directAnswerGeo || page.metaDescription}
                  </p>
                  <Link
                    href={`/top5/${page.slug}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:underline"
                  >
                    <span>לצפייה בטבלה המלאה</span>
                    <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 2: In-Depth Reviews (if available) */}
        {categoryReviews.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-ali-50 text-ali-600">
                <Sparkles className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900">
                סקירות עומק מומלצות
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryReviews.map((rev) => (
                <article
                  key={rev.id}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group"
                >
                  <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                    {rev.featuredImage ? (
                      <Image
                        src={rev.featuredImage}
                        alt={rev.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">תמונה</div>
                    )}
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-2 group-hover:text-ali-600 transition-colors">
                      {rev.title}
                    </h3>
                    <Link
                      href={`/reviews/${rev.slug}`}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-ali-600 group-hover:underline pt-2 border-t border-slate-100"
                    >
                      <span>קרא סקירה מלאה</span>
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Products in Category */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              מוצרים נבחרים בקטגוריה ({categoryProducts.length})
            </h2>
          </div>

          {categoryProducts.length === 0 ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              עדיין לא נוספו מוצרים ישירים לקטגוריה זו. סקירות והשוואות יתווספו בקרוב!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryProducts.map((prod) => {
                const isTaxExempt = prod.priceUsd < 75;
                const goUrl = `/go/${prod.aliId || prod.id}?source=category_${category.slug}`;

                return (
                  <div
                    key={prod.id}
                    className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                      <Image
                        src={prod.mainImage}
                        alt={prod.titleHe || prod.originalTitle}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                      {prod.discountPercent ? (
                        <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                          -{prod.discountPercent}%
                        </span>
                      ) : null}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md border ${
                            isTaxExempt
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-amber-700 bg-amber-50 border-amber-200"
                          }`}
                        >
                          {isTaxExempt ? `פטור ממכס ($${prod.priceUsd})` : `חייב מע"מ ($${prod.priceUsd})`}
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                        {prod.titleHe || prod.originalTitle}
                      </h3>

                      <div className="flex items-baseline gap-1.5 pt-1">
                        <span className="text-xl font-black text-slate-950">₪{prod.priceIls}</span>
                        <span className="text-xs text-slate-400 font-semibold">(${prod.priceUsd})</span>
                      </div>
                    </div>

                    <a
                      href={goUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <span>לדיל באלי אקספרס</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
