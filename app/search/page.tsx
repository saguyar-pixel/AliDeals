import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { supabaseDb, PageRecord, ProductRecord } from "@/lib/db";
import { aliExpressApi } from "@/lib/aliexpress";
import { translateHebrewSearch } from "@/lib/aliexpress/translator";
import { getUsdToIlsRate } from "@/lib/currency/rates";
import { Search, Star, ShieldCheck, ArrowLeft, BookOpen, ExternalLink, Sparkles } from "lucide-react";
import ShareDealButton from "@/components/share/ShareDealButton";

export const dynamic = "force-dynamic";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; taxFree?: string }>;
}

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = (q || "").trim();
  const title = query
    ? `תוצאות חיפוש עבור "${query}" — סקירות ודילים באלי אקספרס`
    : "חיפוש מוצרים, סקירות ודילים באלי אקספרס";

  return {
    title,
    description: query
      ? `השוואת מחירים בשקלים, בדיקת פטור ממכס ($75) וסקירות מאומתות עבור ${query} באתר AliDeals ישראל.`
      : "חפשו מוצרים, סקירות עומק וטבלאות TOP 5 מאלי אקספרס עם מחיר בשקלים ובדיקת פטור ממכס.",
    robots: {
      index: false,
      follow: true,
    },
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, taxFree } = await searchParams;
  const cleanQuery = (q || "").trim();
  const onlyTaxFree = taxFree === "1" || taxFree === "true";

  const rateInfo = await getUsdToIlsRate();
  const ilsRate = rateInfo.rate || 3.65;

  // 1. Search internal reviewed pages & guides in AliDeals catalog
  let matchedSitePages: PageRecord[] = [];
  let allProducts: ProductRecord[] = [];
  try {
    const [pages, prods] = await Promise.all([supabaseDb.getPages(), supabaseDb.getProducts()]);
    allProducts = prods || [];

    if (cleanQuery) {
      const lowerQ = cleanQuery.toLowerCase();
      matchedSitePages = (pages || []).filter((p) => {
        if (p.status !== "published") return false;
        const haystack = `${p.title || ""} ${p.metaTitle || ""} ${p.metaDescription || ""} ${p.targetCategory || ""} ${p.slug || ""}`.toLowerCase();
        return haystack.includes(lowerQ);
      });
    }
  } catch {
    // Graceful fallback
  }

  // 2. Search live AliExpress catalog for fresh consumer deals
  let liveResults: Array<{
    aliId: string;
    title: string;
    priceUsd: number;
    priceIls: number;
    discountPercent: number;
    rating: number;
    ordersCount: number;
    mainImage: string;
    outboundUrl: string;
    underCustomsLimit: boolean;
  }> = [];

  if (cleanQuery && aliExpressApi.isConfigured()) {
    try {
      const isHebrew = /[\u0590-\u05FF]/.test(cleanQuery);
      let keywords = cleanQuery;
      if (isHebrew) {
        const translated = await translateHebrewSearch(cleanQuery);
        keywords = translated.query || cleanQuery;
      }
      const searchRes = await aliExpressApi.searchProducts({
        keywords,
        pageSize: 12,
        sortBy: "LAST_VOLUME_DESC",
      });

      liveResults = (searchRes.products || [])
        .map((p) => {
          const priceUsd = p.priceUsd || 0;
          const priceIls = p.priceIls || Math.round(priceUsd * ilsRate);
          const underCustomsLimit = priceUsd > 0 && priceUsd <= 75;
          const aliId = p.aliId || "";
          return {
            aliId,
            title: p.originalTitle || "מוצר אלי אקספרס",
            priceUsd,
            priceIls,
            discountPercent: p.discountPercent || 0,
            rating: p.rating || 4.8,
            ordersCount: p.ordersCount || 100,
            mainImage: p.mainImage || "",
            outboundUrl: aliId
              ? `/go/${aliId}?sub_id=search_page_result`
              : p.affiliateUrl || p.aliUrl || "https://www.aliexpress.com",
            underCustomsLimit,
          };
        })
        .filter((item) => (onlyTaxFree ? item.underCustomsLimit : true));
    } catch {
      // Keep internal catalog results even if live API times out
    }
  }

  const quickSuggestions = [
    "מקרן נייד",
    "שואב רובוטי",
    "אוזניות אלחוטיות",
    "מטען GaN",
    "מצלמת דרך לרכב",
    "גאדג'טים למטבח",
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-12 pb-20" dir="rtl">
      {/* Search Box Header (Declarative WebMCP Enabled) */}
      <section className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 text-white p-6 sm:p-10 shadow-xl border border-slate-800 space-y-6">
        <div className="max-w-3xl space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-ali-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>חיפוש חכם בעברית ובאנגלית • שער חי: 1$ = ₪{ilsRate}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
            {cleanQuery ? `תוצאות חיפוש עבור "${cleanQuery}"` : "חיפוש מציאות וסקירות באלי אקספרס"}
          </h1>
        </div>

        <form
          action="/search"
          method="GET"
          className="space-y-3"
          {...({
            toolname: "search_aliexpress_israel_deals",
            tooldescription:
              "Search AliDeals Israel for verified AliExpress product reviews, comparisons, and live ILS deals with $75 Israeli customs tax-exemption status.",
            toolautosubmit: "true",
          } as any)}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                name="q"
                defaultValue={cleanQuery}
                placeholder="הקלידו שם מוצר, דגם או קטגוריה (למשל: מקרן נייד, אוזניות, שואב אבק)..."
                className="w-full rounded-2xl bg-white text-slate-950 pr-12 pl-4 py-3.5 text-sm sm:text-base font-medium placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-ali-500 shadow-inner"
                {...({
                  toolparamdescription: "Product keyword, model name, or category in Hebrew or English",
                } as any)}
              />
            </div>
            <button
              type="submit"
              className="px-7 py-3.5 rounded-2xl bg-ali-600 hover:bg-ali-500 text-white font-black text-sm transition-colors shadow-lg cursor-pointer shrink-0"
            >
              חפש מציאות
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-xs">
            <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer select-none">
              <input
                type="checkbox"
                name="taxFree"
                value="1"
                defaultChecked={onlyTaxFree}
                className="rounded border-slate-600 text-emerald-500 focus:ring-emerald-500"
                {...({
                  toolparamdescription: "Set to '1' to filter only items under $75 USD (exempt from Israeli VAT & customs)",
                } as any)}
              />
              <span>הצג רק מוצרים פטורים ממכס ומע&quot;מ בישראל (עד $75)</span>
            </label>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400">חיפושים נפוצים:</span>
              {quickSuggestions.map((item) => (
                <Link
                  key={item}
                  href={`/search?q=${encodeURIComponent(item)}`}
                  className="px-2.5 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
                >
                  {item}
                </Link>
              ))}
            </div>
          </div>
        </form>
      </section>

      {/* Section 1: Verified Site Reviews & Guides */}
      {matchedSitePages.length > 0 && (
        <section className="space-y-5">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              סקירות ומדריכים מאומתים באתר ({matchedSitePages.length})
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {matchedSitePages.map((pg) => {
              const routePath =
                pg.type === "top5"
                  ? `/top5/${pg.slug}`
                  : pg.type === "article" || pg.type === "guide"
                  ? `/articles/${pg.slug}`
                  : `/reviews/${pg.slug}`;

              let pids: string[] = [];
              try {
                pids = typeof pg.productIds === "string" ? JSON.parse(pg.productIds || "[]") : pg.productIds || [];
              } catch {}
              const linkedProd = allProducts.find((p) => pids.includes(p.id) || pids.includes(p.aliId));

              return (
                <article
                  key={pg.id}
                  className="group relative rounded-2xl bg-white border border-slate-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-bold border border-indigo-100">
                        {pg.type === "top5" ? "טבלת TOP 5" : pg.type === "review" ? "סקירת עומק" : "מדריך קנייה"}
                      </span>
                      <div className="relative z-20">
                        <ShareDealButton
                          title={pg.title}
                          url={routePath}
                          priceIls={linkedProd?.priceIls}
                          priceUsd={linkedProd?.priceUsd}
                          contentType={pg.type === "top5" ? "top5" : pg.type === "review" ? "review" : "article"}
                          variant="card"
                        />
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-slate-900 group-hover:text-ali-600 transition-colors line-clamp-2">
                      {pg.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {pg.directAnswerGeo || pg.metaDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {linkedProd?.priceIls ? (
                      <span className="font-black text-base text-slate-950">₪{linkedProd.priceIls}</span>
                    ) : (
                      <span className="text-slate-400">מדריך צרכנות</span>
                    )}
                    <span className="font-bold text-ali-600 flex items-center gap-1">
                      <span>לצפייה מלאה</span>
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </span>
                  </div>

                  <Link href={routePath} className="absolute inset-0 z-10 rounded-2xl">
                    <span className="sr-only">{pg.title}</span>
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Section 2: Live AliExpress Deals */}
      {cleanQuery && (
        <section className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900">
              מציאות חיות מאלי אקספרס ({liveResults.length})
            </h2>
          </div>

          {liveResults.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {liveResults.map((item) => (
                <div
                  key={item.aliId}
                  className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="relative aspect-square bg-slate-50 overflow-hidden">
                    {item.mainImage ? (
                      <Image
                        src={item.mainImage}
                        alt={item.title}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : null}
                    {item.discountPercent > 0 && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-ali-600 text-white text-xs font-black">
                        -{item.discountPercent}%
                      </span>
                    )}
                    <div className="absolute top-3 left-3 z-20">
                      <ShareDealButton
                        title={item.title}
                        url={`/search?q=${encodeURIComponent(item.aliId || cleanQuery)}`}
                        priceIls={item.priceIls}
                        priceUsd={item.priceUsd}
                        isTaxExempt={item.underCustomsLimit}
                        contentType="deal"
                        itemId={item.aliId}
                        variant="card"
                      />
                    </div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold border ${
                            item.underCustomsLimit
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {item.underCustomsLimit ? "פטור ממכס ✓" : "מעל $75"}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                          <span>{item.rating}</span>
                          <span className="text-slate-400 font-normal">({item.ordersCount}+)</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                        {item.title}
                      </h3>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                      <div>
                        <span className="text-xl font-black text-slate-950">₪{item.priceIls}</span>
                        <span className="text-xs text-slate-400 mr-1.5">(${item.priceUsd})</span>
                      </div>

                      <a
                        href={item.outboundUrl}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs transition-colors"
                      >
                        <span>לדיל באלי אקספרס</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center text-sm text-slate-600">
              לא נמצאו תוצאות חיות נוספות עבור מונח זה. נסו מילת חיפוש קצרה יותר בעברית או באנגלית.
            </div>
          )}
        </section>
      )}
    </div>
  );
}
