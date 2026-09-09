import Link from "next/link";
import Image from "next/image";
import { jsonDb, PageRecord } from "@/lib/db";
import { Star, ShieldCheck, Flame, ArrowLeft, Award, Sparkles, PlusCircle } from "lucide-react";
export default async function HomePage() {
  let publishedReviews: PageRecord[] = [];
  let publishedTop5: PageRecord[] = [];

  try {
    publishedReviews = jsonDb.getPagesByType("review").slice(0, 6);
    publishedTop5 = jsonDb.getPagesByType("top5").slice(0, 4);
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

          {/* Quick trust metrics */}
          <div className="pt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-300 font-medium">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>בדיקת רף פטור ממכס ($75)</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
              <Award className="w-4 h-4 text-amber-400" />
              <span>אימות דירוג מוכרים ואמינות</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/50 border border-slate-700/60">
              <Flame className="w-4 h-4 text-ali-400" />
              <span>השוואת מחירי מבצע וקופונים</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        {/* Section 1: Recent Reviews */}
        <section id="reviews" className="space-y-6">
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

          {publishedReviews.length === 0 ? (
            /* Starter State if no pages published yet */
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center space-y-4 bg-white">
              <div className="w-12 h-12 rounded-full bg-ali-50 text-ali-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">ברוכים הבאים למערכת AliDeals!</h3>
              <p className="text-slate-600 text-sm max-w-md mx-auto">
                המערכת מוכנה לג&apos;נרוט אוטומטי של סקירות וטבלאות השוואה. הכנסו ל-CMS והדביקו קישור למוצר מעלי אקספרס.
              </p>
              <Link
                href="/admin/ingest"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-sm shadow-md transition-all"
              >
                <span>פתח את מסך ההזנה (Quick Ingest)</span>
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {publishedReviews.map((page) => (
                <article
                  key={page.id}
                  className="group rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
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
                        <ArrowLeft className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>

                  <Link href={`/reviews/${page.slug}`} className="absolute inset-0">
                    <span className="sr-only">{page.title}</span>
                  </Link>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Section 2: Top 5 Comparison Guides */}
        {publishedTop5.length > 0 && (
          <section id="top5" className="space-y-6">
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">השוואות מדורגות</span>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">טבלאות TOP 5 מומלצות</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {publishedTop5.map((page) => (
                <div
                  key={page.id}
                  className="rounded-2xl bg-gradient-to-br from-indigo-950 to-slate-900 text-white p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden shadow-lg border border-indigo-900"
                >
                  <div className="space-y-3 relative z-10">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/30 text-indigo-300 text-xs font-semibold">
                      <Award className="w-3.5 h-3.5" />
                      טבלת השוואה רשמית
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black leading-snug">{page.title}</h3>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed max-w-lg">
                      {page.directAnswerGeo}
                    </p>
                  </div>

                  <div className="pt-6 relative z-10">
                    <Link
                      href={`/top5/${page.slug}`}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white text-slate-950 font-bold text-xs sm:text-sm hover:bg-indigo-50 transition-colors shadow-md"
                    >
                      <span>לצפייה בטבלת ההשוואה המלאה</span>
                      <ArrowLeft className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Section 3: Authority & SEO Guidance Block */}
        <section className="rounded-3xl bg-white border border-slate-200 p-8 sm:p-12 shadow-sm space-y-6">
          <div className="max-w-3xl">
            <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">מדריך קנייה מקוצר</span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              3 כללי ברזל להזמנה בטוחה מאלי אקספרס לישראל
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm">
                1
              </div>
              <h4 className="font-bold text-slate-900 text-sm">רף הפטור ממכס ($75)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                הזמנות שעלות המוצרים בהן אינה עולה על 75 דולר (לפני משלוח) פטורות לחלוטין ממע&quot;מ ומכס בישראל. שווה לפצל חבילות אם עוברים את הרף!
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-sm">
                2
              </div>
              <h4 className="font-bold text-slate-900 text-sm">בחירת שקע חשמל (EU Plug)</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                במוצרי אלקטרוניקה, בחרו תמיד בגרסת תקע EU (אירופאי). תקע זה מתאים ישירות לשקעים הישראליים ללא צורך במתאמים רופפים ומסוכנים.
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-sm">
                3
              </div>
              <h4 className="font-bold text-slate-900 text-sm">משלוח מעקב מועדף</h4>
              <p className="text-xs text-slate-600 leading-relaxed">
                העדיפו מוכרים המציעים AliExpress Standard Shipping. משלוחים אלו מגיעים בדרך כלל תוך 7–14 ימי עסקים עם מספר מעקב מדויק.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
