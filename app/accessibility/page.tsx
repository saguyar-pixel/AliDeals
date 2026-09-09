import { Metadata } from "next";
import Link from "next/link";
import {
  Accessibility,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  Mail,
  Eye,
  Keyboard,
  Smartphone,
  Layers,
  Sparkles,
} from "lucide-react";

export const metadata: Metadata = {
  title: "הצהרת נגישות",
  description:
    "הצהרת נגישות של פורטל AliDeals ישראל בהתאם לתקן ת\"י 5568 ברמת AA והנחיות WCAG 2.1. מידע על התאמות הנגישות באתר, ניווט מקלדת, ופרטי יצירת קשר עם רכז הנגישות.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/accessibility`,
  },
  openGraph: {
    title: "הצהרת נגישות | AliDeals ישראל",
    description:
      "הצהרת נגישות של פורטל AliDeals ישראל בהתאם לתקן ת\"י 5568 ברמת AA והנחיות WCAG 2.1.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/accessibility`,
    siteName: "AliDeals ישראל",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "הצהרת נגישות | AliDeals ישראל",
    description: "הצהרת נגישות תקנית של פורטל AliDeals ישראל.",
  },
};

export default function AccessibilityPage() {
  const lastUpdated = "ספטמבר 2026";

  return (
    <div className="bg-slate-50 min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-xs text-slate-500 mb-6"
        >
          <Link href="/" className="hover:text-ali-600 transition-colors">
            עמוד הבית
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-slate-800 font-medium">הצהרת נגישות</span>
        </nav>

        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ali-50 text-ali-700 border border-ali-200 mb-4">
            <Accessibility className="w-3.5 h-3.5" />
            <span>תקן ישראלי ת&quot;י 5568 ברמת AA</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            הצהרת נגישות – AliDeals ישראל
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            אנו בפורטל <strong>AliDeals</strong> רואים חשיבות עליונה במתן שירות שוויוני, מכבד, נגיש ומקצועי לכלל הגולשים ברשת, לרבות אנשים עם מוגבלויות. אנו משקיעים משאבים ומאמצים רבים על מנת להבטיח כי האתר יהיה נגיש, קל לשימוש ונוח לתפעול עבור כולם.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>עדכון אחרון: {lastUpdated}</span>
            <span>עמידה בתקנות שוויון זכויות לאנשים עם מוגבלות</span>
          </div>
        </div>

        {/* Standards Card */}
        <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-5 mb-8 flex items-start gap-3 text-blue-950 text-xs sm:text-sm leading-relaxed">
          <CheckCircle2 className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-1">תקינה והנחיות נגישות:</strong>
            אתר זה פועל בהתאם לתקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע&quot;ג-2013, ומיישם את המלצות התקן הישראלי (ת&quot;י 5568) לנגישות תכנים באינטרנט ברמת <strong>AA</strong>, על בסיס מסמך ההנחיות הבינלאומי <strong>WCAG 2.1</strong>.
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          {/* Section 1: Implemented Measures */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                התאמות הנגישות העיקריות שבוצעו באתר
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Feature 1 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5 text-xs sm:text-sm">
                  <Keyboard className="w-4 h-4 text-ali-600" />
                  <span>ניווט מקלדת מלא</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  ניתן לגלוש באתר במלואו באמצעות המקלדת בלבד (Tab, Shift+Tab, חיצים ומקש Enter). ישנו סמן פוקוס ברור ובולט המדגיש את האלמנט הפעיל.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5 text-xs sm:text-sm">
                  <Eye className="w-4 h-4 text-ali-600" />
                  <span>ניגודיות צבעים והגדלת גופן</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  שמירה קפדנית על ניגודיות חזותית גבוהה בין טקסט לרקע. תמיכה בהגדלת גופן וזום של עד 200% באמצעות הדפדפן (Ctrl / Cmd +) ללא שבירת תצוגה.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5 text-xs sm:text-sm">
                  <Layers className="w-4 h-4 text-ali-600" />
                  <span>תאימות לתוכנות קוראות מסך</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  האתר נבנה בקוד סמנטי תקני (HTML5) עם חלוקה לכותרות (H1–H4), תגיות ARIA, ותיאורי טקסט חלופי (Alt Text) לתמונות מוצר ותרשימים.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/60">
                <div className="flex items-center gap-2 font-semibold text-slate-900 mb-1.5 text-xs sm:text-sm">
                  <Smartphone className="w-4 h-4 text-ali-600" />
                  <span>עיצוב רספונסיבי וגמיש</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  תמיכה אופטימלית במגוון רחב של מסכים ומכשירים – מחשבים אישיים, טאבלטים ומכשירים ניידים, לרבות תמיכה בכיווניות מימין לשמאל (RTL).
                </p>
              </div>
            </div>
          </section>

          {/* Section 2: Keyboard Instructions */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Keyboard className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                קיצורי מקשים והנחיות הפעלה
              </h2>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-slate-600 list-disc list-inside pr-1">
              <li>
                <strong>מעבר קדימה בין אלמנטים:</strong> מקש <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-xs">Tab</kbd>
              </li>
              <li>
                <strong>מעבר אחורה בין אלמנטים:</strong> מקשים <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-xs">Shift + Tab</kbd>
              </li>
              <li>
                <strong>הפעלת קישור או כפתור:</strong> מקש <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-xs">Enter</kbd>
              </li>
              <li>
                <strong>פתיחה וסגירה של אקורדיון שאלות/תשובות:</strong> מקש <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-xs">Enter</kbd> או <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-xs">Space</kbd>
              </li>
              <li>
                <strong>סגירת תפריט מובייל נפתח:</strong> מקש <kbd className="px-1.5 py-0.5 rounded bg-slate-100 border text-slate-700 font-mono text-xs">Esc</kbd>
              </li>
            </ul>
          </section>

          {/* Section 3: Third Party Disclaimer */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <AlertCircle className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                הסתייגות לגבי תכנים ואתרים של צדדים שלישיים
              </h2>
            </div>
            <p className="text-slate-600 mb-3">
              האתר AliDeals כולל קישורים המובילים לאתר AliExpress.com ולפלטפורמות מסחר בינלאומיות של צדדים שלישיים.
            </p>
            <p className="text-slate-600">
              הנהלת האתר אינה מפקחת ואינה אחראית לרמת הנגישות באתרים חיצוניים אלו, בדפי המוצר של המוכרים בעלי אקספרס, בתמונות המקוריות המסופקות על ידי מוכרים זרים, או בתהליך התשלום (Checkout) המתבצע כולו בשרתי צד ג&apos;.
            </p>
          </section>

          {/* Section 4: Coordinator & Contact */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                רכז נגישות, דיווח על ליקויים ופניות הציבור
              </h2>
            </div>
            <p className="text-slate-600 mb-3">
              אנו ממשיכים במאמצים מתמידים לשפר את נגישות האתר כחלק ממחויבותנו לאפשר שימוש נוח ושוויוני לכלל הציבור. אם נתקלתם בבעיה, קושי בגלישה או ליקוי נגישות כלשהו, נשמח מאוד לקבל מכם משוב כדי שנוכל לטפל בכך בהקדם.
            </p>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs sm:text-sm">
              <div>
                <strong className="text-slate-900">תפקיד:</strong> רכז נגישות אתר AliDeals
              </div>
              <div>
                <strong className="text-slate-900">דואר אלקטרוני לפניות נגישות:</strong>{" "}
                <a
                  href="mailto:accessibility@ali-deals.co.il"
                  className="font-mono text-ali-600 hover:underline font-semibold"
                >
                  accessibility@ali-deals.co.il
                </a>
              </div>
              <div>
                <strong className="text-slate-900">זמן מענה משוער:</strong> עד 2 ימי עסקים
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-3">
              * בפנייתכם, מומלץ לציין את כתובת הדף (URL) שבו נתקלתם בקושי, סוג המכשיר והדפדפן שבו השתמשתם, וסוג התוכנה המסייעת (במידה ורלוונטי), כדי שנוכל לטפל בפנייה ביעילות המרבית.
            </p>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg bg-white text-slate-700 font-medium text-xs sm:text-sm border border-slate-300 hover:bg-slate-50 transition-colors shadow-sm"
          >
            חזרה לעמוד הבית של AliDeals
          </Link>
        </div>
      </div>
    </div>
  );
}
