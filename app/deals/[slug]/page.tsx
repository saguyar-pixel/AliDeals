import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { jsonDb, supabaseDb } from "@/lib/db";
import DirectAnswerBox from "@/components/DirectAnswerBox";
import StickyBuyBar from "@/components/StickyBuyBar";
import FaqAccordion from "@/components/FaqAccordion";
import PurchaseCtaButton from "@/components/PurchaseCtaButton";
import MarkdownContent from "@/components/MarkdownContent";
import { CustomsBadge } from "@/components/admin/CustomsBadge";
import { Star, ShieldCheck, ShoppingCart, ChevronLeft, Check, HelpCircle, Flame, Clock, Tag } from "lucide-react";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface DealPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: DealPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await supabaseDb.getPageBySlug(slug);

  if (!page) {
    return { title: "דיל בזק לא נמצא" };
  }

  function safeParse<T>(val: unknown, fallback: T): T {
    if (val === undefined || val === null) return fallback;
    if (typeof val !== "string") return val as T;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }

  const productIds: string[] = safeParse(page.productIds, []);
  const firstId = productIds[0];
  const prod = firstId ? (await supabaseDb.getProductById(firstId) || await supabaseDb.getProductByAliId(firstId)) : null;

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const canonicalUrl = `${baseUrl}/deals/${page.slug}`;
  const ogImage = prod?.mainImage || page.featuredImage || `${baseUrl}/og-image.jpg`;

  const metaTitle = page.metaTitle || prod?.titleHe || page.title;
  const metaDescription = page.metaDescription || `דיל בזק בלעדי: ${page.title}. בדקו מחיר מבצע ופטור ממכס באלי אקספרס!`;

  return {
    title: metaTitle,
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
    },
    twitter: {
      card: "summary_large_image",
      title: metaTitle,
      description: metaDescription,
      images: [ogImage],
    },
  };
}

export default async function DealPage({ params }: DealPageProps) {
  const { slug } = await params;
  const page = await supabaseDb.getPageBySlug(slug);

  if (!page || page.status !== "published") {
    const redirectRule = await supabaseDb.getRedirectBySource(`/deals/${slug}`);
    redirect(redirectRule ? redirectRule.targetPath : "/");
  }

  function safeParse<T>(val: unknown, fallback: T): T {
    if (val === undefined || val === null) return fallback;
    if (typeof val !== "string") return val as T;
    try {
      return JSON.parse(val) as T;
    } catch {
      return fallback;
    }
  }

  const productIds: string[] = safeParse(page.productIds, []);
  const firstId = productIds[0];
  const prod = firstId ? (await supabaseDb.getProductById(firstId) || await supabaseDb.getProductByAliId(firstId)) : null;

  const faqs = safeParse<Array<{ question: string; answer: string }>>(
    (page as any).faqs,
    [
      {
        question: "האם המחיר סופי והאם יש פטור ממכס?",
        answer: prod && prod.priceUsd < 75
          ? "כן, מחיר המוצר נמוך מ-75 דולר ולכן הוא פטור לחלוטין ממע\"מ ומכס בישראל."
          : "המוצר מעל 75$ ולכן עשוי לחול מע\"מ (17%) בכניסה לישראל.",
      },
      {
        question: "איך מבטיחים קבלת שקע שמתאים לישראל?",
        answer: "בעת ביצוע ההזמנה בעלי אקספרס יש לבחור באפשרות תקע EU Plug (שקע אירופאי), המתאים בדיוק לשקעים בישראל ללא מתאם.",
      },
      {
        question: "מה זמן המשלוח הממוצע לישראל?",
        answer: "בשיטת משלוח AliExpress Standard Shipping זמני ההגעה הממוצעים נעים בין 7 ל-14 ימי עסקים.",
      },
    ]
  );

  const priceIls = prod ? prod.priceIls : 0;
  const priceUsd = prod ? prod.priceUsd : 0;
  const originalPriceUsd = prod?.originalPriceUsd;
  const discountPercent = prod?.discountPercent || 40;
  const isTaxExempt = priceUsd < 75;

  const estimatedLocalPriceIls = Math.round(priceIls * 2.2);
  const savingsIls = Math.max(estimatedLocalPriceIls - priceIls, 50);

  const buyUrl = prod ? `/go/${prod.aliId}?sub2=${encodeURIComponent(page.slug)}&sub3=deal_main` : "#";

  return (
    <article className="min-h-screen bg-slate-50/50 pb-28" dir="rtl">
      {/* Schema.org Structured Data */}
      {page.structuredDataJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.structuredDataJson }}
        />
      )}

      {/* Top Breadcrumb & Urgency Ticker */}
      <div className="bg-gradient-to-r from-amber-500 via-ali-500 to-rose-600 text-white text-xs font-bold py-2 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 animate-bounce" />
            <span>דיל בזק מוגבל בזמן - המחיר עשוי להתעדכן לפי מלאי הספק</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 opacity-90 text-[11px]">
            <Clock className="w-3.5 h-3.5" />
            <span>סנכרון מחירים חי</span>
          </div>
        </div>
      </div>

      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-3">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500">
            <Link href="/" className="hover:text-ali-600 transition-colors">
              דף הבית
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <Link href="/categories" className="hover:text-ali-600 transition-colors">
              דילים ומבצעים
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-900 font-bold truncate max-w-[200px]">
              {page.title}
            </span>
          </nav>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-black border border-rose-200">
              <Flame className="w-3.5 h-3.5 text-rose-500" />
              <span>דיל בזק בלעדי</span>
            </span>

            {discountPercent > 0 && (
              <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 text-xs font-bold border border-amber-200">
                {discountPercent}% הנחה
              </span>
            )}

            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
              {isTaxExempt ? "פטור מלא ממכס ומע\"מ (<$75)" : "מעל רף 75$"}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
            {page.title}
          </h1>
        </div>
      </header>

      {/* Main Content Showcase */}
      <main className="max-w-4xl mx-auto px-4 pt-8 space-y-10">
        {/* Deal Showcase Card */}
        {prod && (
          <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              {/* Image */}
              <div className="md:col-span-5">
                <div className="relative aspect-square w-full rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 shadow-inner">
                  <Image
                    src={prod.mainImage}
                    alt={prod.titleHe || prod.originalTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 360px"
                    priority
                  />
                  <div className="absolute top-3 right-3 bg-rose-600 text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-md">
                    חיסכון ₪{savingsIls}
                  </div>
                </div>
              </div>

              {/* Price & CTA Column */}
              <div className="md:col-span-7 space-y-5">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 leading-snug">
                    {prod.titleHe || prod.originalTitle}
                  </h2>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                    <div className="flex items-center gap-1 text-amber-500 font-bold">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{prod.rating}</span>
                    </div>
                    <span>•</span>
                    <span>{prod.ordersCount.toLocaleString()}+ הזמנות מאומתות</span>
                    <span>•</span>
                    <span className="text-slate-700 font-medium">{prod.storeName || "AliExpress"}</span>
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">
                      ₪{priceIls}
                    </span>
                    <span className="text-base font-bold text-slate-500">
                      (${priceUsd})
                    </span>
                    <div className="mr-auto text-left">
                      <span className="text-xs text-slate-400 line-through block">
                        בארץ: כ-₪{estimatedLocalPriceIls}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        חוסכים ₪{savingsIls}!
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">סטטוס מכס ומע&quot;מ:</span>
                    <CustomsBadge priceUsd={priceUsd} showDetails={false} />
                  </div>
                </div>

                {/* Big CTA Button */}
                <div className="space-y-2">
                  <PurchaseCtaButton
                    aliUrl={buyUrl}
                    priceIls={priceIls}
                    priceUsd={priceUsd}
                    pageSlug={page.slug}
                    size="lg"
                    className="w-full text-base py-4"
                  />
                  <p className="text-[11px] text-center text-slate-400">
                    🔒 הרכישה מתבצעת ישירות באלי אקספרס עם הגנת קונה מלאה וביטוח משלוח
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Direct Answer Box for AI Overviews */}
        {page.directAnswerGeo && (
          <DirectAnswerBox
            answer={page.directAnswerGeo}
            productName={prod?.titleHe || page.title}
          />
        )}

        {/* Content Markdown */}
        <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-bold text-slate-900">
              כל הפרטים על המבצע: למה זה שווה עכשיו?
            </h2>
          </div>

          <div className="prose prose-slate max-w-none">
            <MarkdownContent content={page.contentMarkdown} />
          </div>
        </section>

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-10 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
              <HelpCircle className="w-5 h-5 text-ali-600" />
              <h2 className="text-xl font-bold text-slate-900">
                שאלות נפוצות על הדיל והמשלוח
              </h2>
            </div>
            <FaqAccordion items={faqs} />
          </section>
        )}

        {/* Final CTA Strip */}
        {prod && (
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
            <div className="space-y-1 text-center sm:text-right">
              <h3 className="text-lg font-bold">רוצים להספיק במחיר המבצע?</h3>
              <p className="text-xs text-slate-300">
                המחיר של ₪{priceIls} תקף כל עוד המלאי שהוקצה לקמפיין לא נגמר.
              </p>
            </div>
            <Link
              href={buyUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="px-6 py-3 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-sm shadow-md transition-all shrink-0 hover:scale-105"
            >
              עבור לדיל באלי אקספרס ←
            </Link>
          </div>
        )}
      </main>

      {/* Mobile Sticky Buy Bar */}
      {prod && (
        <StickyBuyBar
          productName={prod.titleHe || prod.originalTitle}
          priceIls={priceIls}
          priceUsd={priceUsd}
          affiliateUrl={buyUrl}
          pageSlug={page.slug}
        />
      )}
    </article>
  );
}
