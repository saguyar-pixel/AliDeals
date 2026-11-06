import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { supabaseDb, PageRecord, ProductRecord, CouponRecord } from "@/lib/db";
import { getUsdToIlsRate } from "@/lib/currency/rates";
import {
  ShieldCheck,
  ArrowLeft,
  Award,
  Sparkles,
  Tag,
  Search,
  BookOpen,
  Clock,
  CheckCircle2,
  Flame,
} from "lucide-react";
import CustomsCalculator from "@/components/CustomsCalculator";
import CouponBox from "@/components/CouponBox";
import ReviewsExplorer, { EnrichedReviewCardItem } from "@/components/home/ReviewsExplorer";
import ShareDealButton from "@/components/share/ShareDealButton";

export const revalidate = 900; // ISR — רענון כל 15 דקות

export const metadata: Metadata = {
  title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
  description:
    "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, מדריכי קנייה, בדיקת פטור ממכס ($75), תאימות שקע EU 220V והשוואת מחירי מבצע בשקלים.",
  alternates: {
    canonical: "https://ali-deals.co.il",
    types: {
      "text/plain": "https://ali-deals.co.il/llms.txt",
    },
  },
  openGraph: {
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, בדיקת פטור ממכס ($75) והשוואת מחירי מבצע בשקלים.",
    url: "https://ali-deals.co.il",
    siteName: "AliDeals ישראל",
    type: "website",
    locale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. בדיקת פטור ממכס ($75) והשוואת מחירי מבצע בשקלים.",
  },
};

function safeParseArray<T>(val: unknown): T[] {
  if (!val) return [];
  if (Array.isArray(val)) return val as T[];
  if (typeof val === "string") {
    try {
      const parsed = JSON.parse(val);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

export default async function HomePage() {
  let publishedReviews: PageRecord[] = [];
  let publishedTop5: PageRecord[] = [];
  let publishedArticles: PageRecord[] = [];
  let allProds: ProductRecord[] = [];
  let featuredProducts: ProductRecord[] = [];
  let heroPills: any[] = [];
  let activeHomeCoupon: CouponRecord | null = null;

  const rateInfo = await getUsdToIlsRate();
  const ilsRate = rateInfo.rate || 3.65;
  const taxFreeThresholdIls = Math.round(75 * ilsRate);

  try {
    const [allPages, products, allNav, coupons] = await Promise.all([
      supabaseDb.getPages(),
      supabaseDb.getProducts(),
      supabaseDb.getNavigationMenu(),
      supabaseDb.getCoupons(),
    ]);

    const published = (allPages || []).filter((p) => p.status === "published");
    publishedReviews = published.filter((p) => p.type === "review");
    publishedTop5 = published.filter((p) => p.type === "top5");
    publishedArticles = published.filter((p) => p.type === "article" || p.type === "guide");

    allProds = products || [];
    featuredProducts = allProds.filter((p) => p.status !== "inactive").slice(0, 5);

    heroPills = (allNav || [])
      .filter((item) => item.placement === "hero_pills" && item.isActive)
      .sort((a: any, b: any) => (a.sortOrder || a.order || 0) - (b.sortOrder || b.order || 0));

    activeHomeCoupon =
      (coupons || []).find(
        (c) => c.isActive && (!c.placements || c.placements.includes("all") || c.placements.includes("home"))
      ) || null;
  } catch (err) {
    console.warn("DB query during build/init:", err);
  }

  // Enrich reviews with live product pricing & tax-exempt metadata for Homepage cards
  const enrichedReviews: EnrichedReviewCardItem[] = publishedReviews.map((page) => {
    const pids = safeParseArray<string>(page.productIds);
    const matchedProd = allProds.find((p) => pids.includes(p.id) || pids.includes(p.aliId));
    const priceUsd = matchedProd?.priceUsd;
    const priceIls =
      matchedProd?.priceIls || (typeof priceUsd === "number" && priceUsd > 0 ? Math.round(priceUsd * ilsRate) : undefined);
    const isTaxExempt = typeof priceUsd === "number" ? priceUsd < 75 : undefined;
    const prosArr = safeParseArray<string>(page.pros);

    return {
      id: page.id,
      slug: page.slug,
      title: page.title,
      summary: page.directAnswerGeo || page.metaDescription || "",
      featuredImage: page.featuredImage || matchedProd?.mainImage || null,
      category: page.targetCategory || matchedProd?.category || "סקירה",
      updatedAt: page.updatedAt,
      priceIls,
      priceUsd,
      rating: matchedProd?.rating,
      ordersCount: matchedProd?.ordersCount,
      isTaxExempt,
      prosPreview: prosArr.slice(0, 2),
    };
  });

  // Safe fallback if heroPills are not yet configured in CMS
  const displayPills =
    heroPills.length > 0
      ? heroPills
      : [
          ...publishedTop5.slice(0, 3).map((page) => ({
            id: page.id,
            title: page.title,
            href: `/top5/${page.slug}`,
            icon: "⭐",
          })),
          {
            id: "articles_hub",
            title: "מדריכי צרכנות",
            href: "/articles",
            icon: "📖",
          },
          {
            id: "customs_calc",
            title: "מחשבון מכס $75",
            href: "/#customs-guide",
            icon: "🛡️",
          },
        ];

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  // Homepage Structured Data for Google Rich Results & Generative Engine Optimization (GEO)
  const homeRichSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        "@id": `${baseUrl}/#homepage`,
        url: baseUrl,
        name: "AliDeals ישראל — סקירות מוצרים, טבלאות TOP 5 ודילים פטורים ממכס באלי אקספרס",
        description:
          "פורטל הצרכנות הישראלי לקניות חכמות באלי אקספרס: סקירות מוצרים מעמיקות, בדיקת פטור ממכס עד $75, תאימות לשקע אירופאי (EU 220V) ומדריכי השוואה.",
        inLanguage: "he-IL",
        isPartOf: { "@id": `${baseUrl}/#website` },
      },
      {
        "@type": "ItemList",
        name: "סקירות מוצרים ומדריכים מובילים ב-AliDeals",
        itemListElement: enrichedReviews.slice(0, 10).map((item, idx) => ({
          "@type": "ListItem",
          position: idx + 1,
          name: item.title,
          url: `${baseUrl}/reviews/${item.slug}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "מהו רף הפטור ממכס ומע\"מ בהזמנה מאלי אקספרס לישראל?",
            acceptedAnswer: {
              "@type": "Answer",
              text: `הזמנות שערך המוצרים בהן (לפני משלוח) אינו עולה על 75 דולר (כ-₪${taxFreeThresholdIls} לפי שער יציג של ₪${ilsRate}) פטורות לחלוטין ממע\"מ וממכס בישראל. בהזמנות מעל 75$ חל חיוב במע\"מ בשיעור 18%.`,
            },
          },
          {
            "@type": "Question",
            name: "איזה שקע חשמל צריך לבחור באלי אקספרס כדי שיתאים לישראל?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "בישראל רשת החשמל פועלת במתח 220V-230V / 50Hz. ברכישת מוצרי חשמל מאלי אקספרס יש לבחור בגרסת EU Plug (תקע אירופאי), המתאימה ישירות לשקעים בישראל ללא צורך במתאם או שנאי.",
            },
          },
          {
            "@type": "Question",
            name: "איזו שיטת משלוח הכי מומלצת ומהירה מאלי אקספרס לישראל?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "מסלולי המשלוח המומלצים ביותר לישראל הם AliExpress Choice ו-AliExpress Standard Shipping, המספקים מספר מעקב מלא וזמן הגעה ממוצע של 7 עד 14 ימי עסקים לנקודת איסוף קרובה או שליח.",
            },
          },
        ],
      },
    ],
  };

  const effectiveCouponCode = activeHomeCoupon?.code || "ALIBUY2026";
  const effectiveCouponTitle = activeHomeCoupon?.title || "הנחה לרוכשים מישראל";
  const effectiveCouponDiscount = activeHomeCoupon?.discountText || "קופון בלעדי לאתר";
  const effectiveCouponMinSpend = activeHomeCoupon?.minSpendUsd
    ? `להזמנות מעל $${activeHomeCoupon.minSpendUsd} באלי אקספרס.`
    : "להזמנות מעל $30 באלי אקספרס.";

  return (
    <div className="space-y-16 sm:space-y-20 pb-20">
      {/* Structured Data for SEO & GEO */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(homeRichSchema).replace(/</g, "\\u003c").replace(/>/g, "\\u003e"),
        }}
      />

      {/* Hero Section: Magazine Header + Instant Search + Live Israeli Buyer Trust Strip */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-indigo-950 text-white pt-14 pb-16 sm:py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Ambient Glows */}
        <div className="hidden md:block absolute -top-12 -right-24 w-[28rem] h-[28rem] bg-ali-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="hidden md:block absolute -bottom-16 -left-24 w-[28rem] h-[28rem] bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          {/* Top Editorial Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-800/90 border border-slate-700/80 text-xs font-bold text-ali-400 shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-ali-500" />
            <span>מגזין הצרכנות הישראלי לאלי אקספרס • סקירות אמת, בדיקת מכס ותאימות 220V</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight">
            קונים חכם ב<span className="text-ali-500">אלי אקספרס</span> — בלי הפתעות במכס
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            אנו בוררים אלפי מוצרים, מנתחים ביקורות רוכשים מישראל, מוודאים תקע אירופאי (EU) ופטור ממע&quot;מ (עד $75), ומביאים רק את המציאות שבאמת שוות את הכסף שלכם.
          </p>

          {/* Hero Instant Search Form (SEO SearchAction + WebMCP Declarative Tool) */}
          <form
            action="/search"
            method="GET"
            className="max-w-2xl mx-auto pt-2"
            {...({
              toolname: "search_alideals_catalog",
              tooldescription:
                "Search AliDeals Israel for product reviews, TOP 5 comparisons, and live AliExpress deals in ILS with $75 customs tax-free verification.",
              toolautosubmit: "true",
            } as any)}
          >
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-2 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 shadow-2xl">
              <div className="relative flex-1 flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute right-4 pointer-events-none" />
                <input
                  type="search"
                  name="q"
                  placeholder="חפשו מוצר, דגם או קטגוריה (למשל: מקרן נייד, שואב רובוטי, מטען GaN)..."
                  aria-label="חיפוש מוצרים וסקירות באתר"
                  className="w-full bg-white text-slate-950 rounded-xl pr-11 pl-4 py-3 text-sm font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ali-500"
                  {...({
                    toolparamdescription: "Product name, brand, model, or category in Hebrew or English",
                  } as any)}
                />
              </div>
              <button
                type="submit"
                className="px-6 py-3 rounded-xl bg-ali-600 hover:bg-ali-500 text-white font-black text-sm transition-all shadow-lg cursor-pointer shrink-0"
              >
                חיפוש מציאה
              </button>
            </div>
          </form>

          {/* Live Israeli Shopper Telemetry Strip */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>תקרת פטור ממכס היום ($75): כ-₪{taxFreeThresholdIls}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold">
              <span>שער דולר חי: 1$ = ₪{ilsRate}</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-slate-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>{publishedReviews.length + publishedTop5.length + publishedArticles.length}+ סקירות ומדריכים מאומתים</span>
            </span>
          </div>

          {/* Dynamic Category & Quick Navigation Pills */}
          <div className="pt-2 flex flex-wrap items-center justify-center gap-2 text-xs font-medium">
            {displayPills.map((pill) => (
              <Link
                key={pill.id || pill.href}
                href={pill.href}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/75 hover:bg-slate-700 border border-slate-700 hover:border-ali-500 text-slate-200 transition-all"
              >
                <span>{pill.icon || "🔍"}</span>
                <span className="font-semibold">{(pill as any).label || (pill as any).title}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-20">
        {/* Section 1: In-Depth Reviews Explorer (Spotlight + Category Filter + Share) */}
        <section id="reviews" className="space-y-6 scroll-mt-24">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">נבדק ואומת לישראל</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">סקירות מוצרים ומציאות מומלצות</h2>
            </div>
            <Link
              href="/#top5"
              className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3.5 py-2 rounded-xl border border-indigo-100 transition-colors"
            >
              <span>לכל השוואות ה-TOP 5</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <ReviewsExplorer items={enrichedReviews} />
        </section>

        {/* Section 2: Top 5 Comparison Guides */}
        {publishedTop5.length > 0 && (
          <section id="top5" className="space-y-6 scroll-mt-24">
            <div className="flex items-end justify-between">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">השוואות מדורגות</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">טבלאות TOP 5 מומלצות</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publishedTop5.map((page) => (
                <div
                  key={page.id}
                  className="group relative rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-lg border border-indigo-900 hover:border-indigo-700 transition-all"
                >
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-semibold">
                        <Award className="w-3.5 h-3.5" />
                        טבלת השוואה רשמית
                      </span>
                      <div className="relative z-30">
                        <ShareDealButton
                          title={page.title}
                          url={`/top5/${page.slug}`}
                          contentType="top5"
                          itemId={page.slug}
                          variant="card"
                        />
                      </div>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black leading-snug group-hover:text-indigo-200 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg line-clamp-3">
                      {page.directAnswerGeo || page.metaDescription}
                    </p>
                  </div>

                  <div className="pt-6 relative z-10 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm group-hover:bg-indigo-50 transition-colors shadow-md">
                      <span>לצפייה בטבלת ההשוואה המלאה</span>
                      <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    </span>
                  </div>

                  {/* Entire card is clickable */}
                  <Link href={`/top5/${page.slug}`} className="absolute inset-0 z-20">
                    <span className="sr-only">{page.title}</span>
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Ron's Consumer Guides & Magazine Articles (/articles) */}
        {publishedArticles.length > 0 && (
          <section id="guides" className="space-y-6 scroll-mt-24">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-sky-600 uppercase tracking-wider">מדריכי עומק וצרכנות</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
                  מדריכי הקנייה החכמה של רון
                </h2>
              </div>
              <Link
                href="/articles"
                className="self-start sm:self-auto inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 px-3.5 py-2 rounded-xl border border-sky-200/80 transition-colors"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>לכל המדריכים והמאמרים ({publishedArticles.length})</span>
                <ArrowLeft className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {publishedArticles.slice(0, 3).map((article) => {
                const wordCount = (article.contentMarkdown || "").split(/\s+/).filter(Boolean).length;
                const readMin = Math.max(3, Math.ceil(wordCount / 180));

                return (
                  <article
                    key={article.id}
                    className="group relative rounded-2xl bg-white border border-slate-200/90 hover:border-sky-300 overflow-hidden shadow-xs hover:shadow-lg transition-all flex flex-col"
                  >
                    <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                      {article.featuredImage ? (
                        <Image
                          src={article.featuredImage}
                          alt={article.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 768px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-sky-50 to-indigo-50 text-sky-400">
                          <BookOpen className="w-10 h-10 opacity-60" />
                        </div>
                      )}

                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-[11px] font-bold z-10 pointer-events-none">
                        {article.targetCategory || "מדריך צרכנות"}
                      </span>

                      <div className="absolute top-2.5 left-2.5 z-20">
                        <ShareDealButton
                          title={article.title}
                          url={`/articles/${article.slug}`}
                          contentType="article"
                          itemId={article.slug}
                          variant="card"
                        />
                      </div>
                    </div>

                    <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium">
                          <Clock className="w-3.5 h-3.5 text-sky-600" />
                          <span>קריאה של כ-{readMin} דקות</span>
                        </div>
                        <h3 className="font-bold text-base text-slate-900 line-clamp-2 group-hover:text-sky-700 transition-colors leading-snug">
                          {article.title}
                        </h3>
                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                          {article.directAnswerGeo || article.metaDescription}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-bold text-sky-700 group-hover:underline flex items-center gap-1">
                          <span>קרא את המדריך</span>
                          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>

                    <Link href={`/articles/${article.slug}`} className="absolute inset-0 z-10 rounded-2xl">
                      <span className="sr-only">{article.title}</span>
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>
        )}

        {/* Section 4: Hot Deals & Coupons */}
        <section id="deals" className="space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ali-600 uppercase tracking-wider flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                <span>מבצעים בלעדיים</span>
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">דילים חמים וקופונים שווים</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {featuredProducts.map((prod) => {
              const reviewPage = publishedReviews.find((r) => {
                const pids = safeParseArray<string>(r.productIds);
                return pids.includes(prod.id) || pids.includes(prod.aliId);
              });
              const dealUrl = reviewPage ? `/reviews/${reviewPage.slug}` : `/go/${prod.aliId || prod.id}`;
              const shareUrl = reviewPage ? `/reviews/${reviewPage.slug}` : `/search?q=${encodeURIComponent(prod.aliId || prod.titleHe || prod.originalTitle)}`;
              const isTaxExempt = prod.priceUsd < 75;
              const computedIls = prod.priceIls || Math.round(prod.priceUsd * ilsRate);

              return (
                <div
                  key={prod.id}
                  className="rounded-2xl bg-white border border-slate-200 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-center gap-5 sm:gap-6 group hover:shadow-md hover:border-slate-300 transition-all"
                >
                  <a
                    href={dealUrl}
                    target={reviewPage ? undefined : "_blank"}
                    rel={reviewPage ? undefined : "noopener noreferrer sponsored"}
                    className="relative w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0 block group-hover:opacity-95 transition-opacity"
                    title={prod.titleHe || prod.originalTitle}
                  >
                    <Image
                      src={prod.mainImage}
                      alt={prod.titleHe || prod.originalTitle}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 640px) 100vw, 160px"
                    />
                    {prod.discountPercent ? (
                      <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                        -{prod.discountPercent}%
                      </span>
                    ) : null}
                  </a>

                  <div className="space-y-3 flex-1 w-full">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`font-bold px-2 py-0.5 rounded-md border ${
                            isTaxExempt
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-amber-700 bg-amber-50 border-amber-200"
                          }`}
                        >
                          {isTaxExempt ? `פטור ממכס ($${prod.priceUsd})` : `חייב מע"מ ($${prod.priceUsd})`}
                        </span>
                        {prod.ordersCount ? (
                          <span className="text-slate-500">{prod.ordersCount}+ רכישות</span>
                        ) : null}
                      </div>

                      <ShareDealButton
                        title={prod.titleHe || prod.originalTitle}
                        url={shareUrl}
                        priceIls={computedIls}
                        priceUsd={prod.priceUsd}
                        isTaxExempt={isTaxExempt}
                        contentType="deal"
                        itemId={prod.aliId || prod.id}
                        variant="card"
                      />
                    </div>

                    <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug line-clamp-2">
                      {prod.titleHe || prod.originalTitle}
                    </h3>

                    {prod.descriptionHe && (
                      <p className="text-xs text-slate-600 leading-relaxed line-clamp-2">
                        {prod.descriptionHe}
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-4 pt-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-slate-950">₪{computedIls}</span>
                        <span className="text-xs font-semibold text-slate-500">(${prod.priceUsd})</span>
                      </div>
                      <Link
                        href={dealUrl}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                      >
                        <span>{reviewPage ? "קרא סקירה" : "מעבר לדיל"}</span>
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Exclusive Coupon Card (Preserved with DB override + ALIBUY2026 fallback) */}
            <div className="rounded-2xl bg-gradient-to-br from-ali-50 to-orange-50 border border-ali-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-ali-600" />
                  <span className="text-xs font-bold text-ali-600 uppercase">קופון חודשי פעיל</span>
                </div>
                <h4 className="font-bold text-base text-slate-900">{effectiveCouponTitle}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  קוד קופון רשמי {effectiveCouponMinSpend} העתיקו והדביקו בעגלת הקניות לפני ביצוע התשלום.
                </p>
              </div>
              <CouponBox couponCode={effectiveCouponCode} discountText={effectiveCouponDiscount} />
            </div>
          </div>
        </section>

        {/* Section 5: Customs Guide & Live Calculator */}
        <section id="customs-guide" className="space-y-8 scroll-mt-24">
          <div className="max-w-3xl">
            <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">מדריך קנייה ומחשבון חכם</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              3 כללי ברזל להזמנה בטוחה מאלי אקספרס לישראל
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">רף הפטור ממכס ($75)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                הזמנות שעלות המוצרים בהן אינה עולה על 75 דולר (לפני משלוח) פטורות לחלוטין ממע&quot;מ (18%) ומכס בישראל. שווה לפצל חבילות אם עוברים את הרף!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">בחירת שקע חשמל (EU Plug)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                במוצרי אלקטרוניקה, בחרו תמיד בגרסת תקע EU (אירופאי 220V). תקע זה מתאים ישירות לשקעים הישראליים ללא צורך במתאמים רופפים ומסוכנים.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">משלוחי Choice ומעקב מלא</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                העדיפו מוכרים המציעים AliExpress Choice או Standard Shipping. משלוחים אלו מגיעים בדרך כלל תוך 7–14 ימי עסקים עם מספר מעקב מדויק.
              </p>
            </div>
          </div>

          {/* Interactive Calculator */}
          <CustomsCalculator />
        </section>
      </div>
    </div>
  );
}
