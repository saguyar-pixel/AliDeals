import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { jsonDb, PageRecord } from "@/lib/db";
import { Star, ShieldCheck, Flame, ArrowLeft, Award, Sparkles, Tag, ShoppingCart, Check } from "lucide-react";
import CustomsCalculator from "@/components/CustomsCalculator";
import CouponBox from "@/components/CouponBox";

export const metadata: Metadata = {
  title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
  description:
    "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, אינפוגרפיקות בעברית, בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
  alternates: {
    canonical: "https://ali-deals.co.il",
  },
  openGraph: {
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. סקירות עומק כנות, בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
    url: "https://ali-deals.co.il",
    siteName: "AliDeals ישראל",
    images: [
      {
        url: "https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=630&fit=crop&q=80",
        width: 1200,
        height: 630,
        alt: "AliDeals ישראל",
      },
    ],
    type: "website",
    locale: "he_IL",
  },
  twitter: {
    card: "summary_large_image",
    title: "AliDeals - סקירות מוצרים, טבלאות TOP 5 ודילים באלי אקספרס",
    description:
      "פורטל הקניות וההשוואות המוביל למוצרי אלי אקספרס בישראל. בדיקת פטור ממכס ($75) והשוואת מחירי מבצע.",
    images: ["https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200&h=630&fit=crop&q=80"],
  },
};

export default async function HomePage() {
  let publishedReviews: PageRecord[] = [];
  let publishedTop5: PageRecord[] = [];

  try {
    publishedReviews = jsonDb.getPagesByType("review");
    publishedTop5 = jsonDb.getPagesByType("top5");
  } catch (err) {
    console.warn("DB query during build/init:", err);
  }

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-20 px-4 sm:px-6 lg:px-8 border-b border-slate-800">
        {/* Decorative background glow */}
        <div className="absolute top-1/4 -right-20 w-96 h-96 bg-ali-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 -left-20 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-800/80 border border-slate-700 text-xs font-semibold text-ali-400">
            <Sparkles className="w-3.5 h-3.5 text-ali-500" />
            <span>סקירות אובייקטיביות | בדיקות מעבדה | אינפוגרפיקות AI</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight sm:leading-tight">
            המדריך הישראלי לקניות חכמות ב<span className="text-ali-500">אלי אקספרס</span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            אנו מסננים אלפי מוצרים, מנתחים ביקורות אמת, בודקים פטור ממכס (עד $75) ותאימות שקעים לישראל, כדי שתוכלו לקנות בביטחון
            ובמחיר הזול ביותר.
          </p>

          {/* Clickable category quick navigation pills */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-2.5 text-xs font-medium">
            <Link
              href="/top5/top-5-mini-projectors-aliexpress"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-ali-500 text-slate-200 transition-all group"
            >
              <span>📽️</span>
              <span className="font-semibold">מקרנים חכמים לבית</span>
            </Link>
            <Link
              href="/top5/top-5-baby-monitors-aliexpress"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-indigo-400 text-slate-200 transition-all group"
            >
              <span>👶</span>
              <span className="font-semibold">מוניטורים לתינוקות</span>
            </Link>
            <Link
              href="/top5/top-5-sports-shorts-aliexpress"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700 hover:border-emerald-400 text-slate-200 transition-all group"
            >
              <span>🏃</span>
              <span className="font-semibold">מכנסוני ספורט וריצה</span>
            </Link>
            <Link
              href="/#customs-guide"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/60 text-emerald-200 transition-all group"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>מחשבון מכס $75</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section 1: Recent Reviews */}
        <section id="reviews" className="space-y-6 scroll-mt-24">
          <div className="flex items-end justify-between">
            <div>
              <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">נבדק על ידינו</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">סקירות מוצרים מעמיקות</h2>
            </div>
            <Link
              href="/#top5"
              className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-2 rounded-lg border border-indigo-100 transition-colors"
            >
              <span>צפה בכל טבלאות TOP 5</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {publishedReviews.map((page) => (
              <article
                key={page.id}
                className="group relative rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-lg hover:border-slate-300 transition-all flex flex-col cursor-pointer"
              >
                <div className="relative aspect-video w-full bg-slate-100 overflow-hidden">
                  {page.featuredImage ? (
                    <Image
                      src={page.featuredImage}
                      alt={page.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">תמונה</div>
                  )}
                  <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-slate-900/80 backdrop-blur text-white text-[11px] font-bold">
                    {page.targetCategory || "סקירה"}
                  </span>
                </div>

                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-slate-900 line-clamp-2 group-hover:text-ali-600 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2 mt-2 leading-relaxed">
                      {page.directAnswerGeo || page.metaDescription}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-ali-600 group-hover:underline flex items-center gap-1">
                      <span>קרא את הסקירה המלאה</span>
                      <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>

                {/* Clickable entire card overlay link */}
                <Link href={`/reviews/${page.slug}`} className="absolute inset-0 z-10">
                  <span className="sr-only">{page.title}</span>
                </Link>
              </article>
            ))}
          </div>
        </section>

        {/* Section 2: Top 5 Comparison Guides */}
        {publishedTop5.length > 0 && (
          <section id="top5" className="space-y-6 scroll-mt-24">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">השוואות מדורגות</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">טבלאות TOP 5 מומלצות</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publishedTop5.map((page) => (
                <div
                  key={page.id}
                  className="group relative rounded-2xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between overflow-hidden shadow-lg border border-indigo-900 hover:border-indigo-700 transition-all"
                >
                  <div className="space-y-3 relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      טבלת השוואה רשמית
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black leading-snug group-hover:text-indigo-200 transition-colors">
                      {page.title}
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
                      {page.directAnswerGeo}
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

        {/* Section 3: Hot Deals & Coupons */}
        <section id="deals" className="space-y-6 scroll-mt-24">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">מבצעים בלעדיים</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">דילים חמים וקופונים שווים</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Featured Deal Card 1 - Projector */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                <Image
                  src="https://ae01.alicdn.com/kf/S928f18662dda44b38b0f68a7909ace46Y.jpeg"
                  alt="Magcubic L018"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 160px"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                  -51%
                </span>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    פטור ממכס ($72.90)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">11,000+ רכישות</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                  מקרן הדגל Magcubic L018 - בהירות 650 ANSI וסיבוב 360°
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  רזולוציית 1080P טבעית, פוקוס וכיוון טרפז אוטומטיים לחלוטין (Auto Focus), שלט Air Mouse חכם ואנדרואיד 14.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-950">₪266</span>
                    <span className="text-xs text-slate-400 line-through">₪490</span>
                  </div>
                  <Link
                    href="/reviews/magcubic-l018-1080p-650ansi-projector-review"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <span>קרא סקירה</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Featured Deal Card 2 - Baby Monitor */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1544126592-807daf21565c?w=800"
                  alt="TakTark Baby Monitor"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 160px"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                  -49%
                </span>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    פטור ממכס ($39.99)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">18,500+ רכישות</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                  מוניטור וידאו לתינוק TakTark 3.2&quot; ללא WiFi
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  המוניטור הכי נמכר: שידור רדיו פרטי מוצפן וחסין פריצות, ראיית לילה ומצב VOX חסכוני בסוללה.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-950">₪146</span>
                    <span className="text-xs text-slate-400 line-through">₪289</span>
                  </div>
                  <Link
                    href="/reviews/taktark-3-2-inch-video-baby-monitor-review"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <span>קרא סקירה</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Featured Deal Card 3 - Sports Shorts */}
            <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
              <div className="relative w-full sm:w-40 aspect-square rounded-xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                <Image
                  src="https://images.unsplash.com/photo-1591195853828-11db59a44f6b?w=800"
                  alt="מכנסוני ריצה 2 ב-1"
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 100vw, 160px"
                />
                <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                  -50%
                </span>
              </div>
              <div className="space-y-3 flex-1">
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                    פטור ממכס ($11.99)
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-500">8,700+ רכישות</span>
                </div>
                <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-snug">
                  מכנסוני ריצה 2 ב-1 עם טייץ פנימי מובנה וכיס לטלפון
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  הפתרון המושלם לקיץ הישראלי: טייץ דחיסה מונע שפשופים וכיס הדוק שמחזיק את הסמארטפון יציב בריצה.
                </p>
                <div className="flex items-center gap-4 pt-1">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-slate-950">₪44</span>
                    <span className="text-xs text-slate-400 line-through">₪88</span>
                  </div>
                  <Link
                    href="/reviews/running-shorts-2-in-1-phone-pocket-review"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                  >
                    <span>קרא סקירה</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Exclusive Coupon Card */}
            <div className="rounded-2xl bg-gradient-to-br from-ali-50 to-orange-50 border border-ali-200 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-ali-600" />
                  <span className="text-xs font-bold text-ali-600 uppercase">קופון חודשי פעיל</span>
                </div>
                <h4 className="font-bold text-base text-slate-900">הנחה לרוכשים מישראל</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  קוד קופון רשמי להזמנות מעל $30 באלי אקספרס. העתיקו והדביקו בעגלת הקניות לפני ביצוע התשלום.
                </p>
              </div>
              <CouponBox couponCode="ALIBUY2026" discountText="קופון בלעדי לאתר" />
            </div>
          </div>
        </section>

        {/* Section 4: Customs Guide & Live Calculator */}
        <section id="customs-guide" className="space-y-8 scroll-mt-24">
          <div className="max-w-3xl">
            <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">מדריך קנייה ומחשבון חכם</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              3 כללי ברזל להזמנה בטוחה מאלי אקספרס לישראל
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">רף הפטור ממכס ($75)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                הזמנות שעלות המוצרים בהן אינה עולה על 75 דולר (לפני משלוח) פטורות לחלוטין ממע&quot;מ ומכס בישראל. שווה לפצל חבילות אם עוברים את הרף!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">בחירת שקע חשמל (EU Plug)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                במוצרי אלקטרוניקה, בחרו תמיד בגרסת תקע EU (אירופאי). תקע זה מתאים ישירות לשקעים הישראליים ללא צורך במתאמים רופפים ומסוכנים.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">משלוח מעקב מועדף</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                העדיפו מוכרים המציעים AliExpress Standard Shipping. משלוחים אלו מגיעים בדרך כלל תוך 7–14 ימי עסקים עם מספר מעקב מדויק.
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
