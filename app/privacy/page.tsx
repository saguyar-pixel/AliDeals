import { Metadata } from "next";
import Link from "next/link";
import {
  Lock,
  Eye,
  ShieldCheck,
  Cookie,
  Server,
  ExternalLink,
  ChevronLeft,
  Mail,
  UserCheck,
  FileCheck,
} from "lucide-react";

export const metadata: Metadata = {
  title: "מדיניות פרטיות ואבטחת מידע",
  description:
    "מדיניות הפרטיות של פורטל AliDeals ישראל. מידע מפורט על שמירת פרטיות המשתמשים, שימוש בעוגיות (Cookies), ניתוח סטטיסטי באמצעות GA4 ושקיפות מלאה לגבי אי-איסוף פרטי אשראי.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/privacy`,
  },
  openGraph: {
    title: "מדיניות פרטיות ואבטחת מידע | AliDeals ישראל",
    description:
      "מדיניות הפרטיות של פורטל AliDeals ישראל. שקיפות מלאה לגבי אי-איסוף פרטי אשראי ושימוש ב-GA4.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/privacy`,
    siteName: "AliDeals ישראל",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "מדיניות פרטיות ואבטחת מידע | AliDeals ישראל",
    description: "מדיניות הפרטיות ואבטחת המידע של פורטל AliDeals ישראל.",
  },
};

export default function PrivacyPage() {
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
          <span className="text-slate-800 font-medium">מדיניות פרטיות</span>
        </nav>

        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ali-50 text-ali-700 border border-ali-200 mb-4">
            <Lock className="w-3.5 h-3.5" />
            <span>הגנה על פרטיות ושקיפות</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            מדיניות פרטיות ואבטחת מידע – AliDeals
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            אנו בפורטל <strong>AliDeals</strong> (להלן: &quot;האתר&quot; או &quot;הנהלת האתר&quot;) מכבדים את פרטיות הגולשים ורואים חשיבות רבה בשמירה עליה. מסמך זה מפרט בשקיפות מלאה את המידע הנאסף בעת השימוש באתר, את אופן השימוש בו, ואת האמצעים הננקטים לאבטחתו, בהתאם להוראות חוק הגנת הפרטיות, התשמ&quot;א-1981 ותקנותיו.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>עדכון אחרון: {lastUpdated}</span>
            <span>חוק הגנת הפרטיות, התשמ&quot;א-1981</span>
          </div>
        </div>

        {/* Privacy Highlight Badge */}
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-5 mb-8 flex items-start gap-3 text-emerald-900 text-xs sm:text-sm leading-relaxed">
          <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-1">עיקרון מוביל – אפס איסוף פרטי אשראי או סיסמאות:</strong>
            האתר AliDeals <strong>אינו דורש הרשמה, אינו שומר פרטי אשראי, ואינו גובה כספים</strong>. כל פעולות התשלום והזנת הכתובות מתבצעות אך ורק בשרתי AliExpress המאובטחים.
          </div>
        </div>

        {/* Content Sections */}
        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <UserCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                1. איזה מידע איננו אוספים?
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                1.1. <strong>פרטי תשלום ואשראי:</strong> האתר אינו אוסף, אינו רואה ואינו מאחסן מספרי כרטיסי אשראי, פרטי חשבון בנק, חשבונות PayPal או כל מידע פיננסי אחר.
              </p>
              <p>
                1.2. <strong>פרטי זיהוי רגישים:</strong> האתר אינו מבקש תעודות זהות, סיסמאות, כתובות מגורים לצורך שילוח, או מידע אישי מזהה כלשהו לצורך גלישה בתכנים.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Eye className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                2. מידע סטטיסטי וטכני הנאסף בעת הגלישה
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                2.1. בעת גלישה באתר, נאסף באופן אוטומטי מידע טכני וסטטיסטי שאינו מזהה אותך אישית (&quot;Non-Personally Identifiable Information&quot;):
              </p>
              <ul className="list-disc list-inside space-y-1.5 pr-2 text-slate-600">
                <li>סוג הדפדפן וגרסתו, מערכת ההפעלה (Windows, Android, iOS וכו&quot;).</li>
                <li>סוג המכשיר (מחשב שולחני, טאבלט, טלפון חכם) ורזולוציית המסך.</li>
                <li>כתובת IP (הנרשמת ביומני שרת סטנדרטיים ומעובדת לצורכי אבטחה ומניעת הונאות).</li>
                <li>דפים שנצפו באתר, זמני שהייה, תאריכי ושעות כניסה, ומקור ההפניה (האתר שממנו הגעת אלינו).</li>
              </ul>
              <p>
                2.2. מידע זה משמש אך ורק לניתוח ביצועים טכניים, שיפור חוויית הגלישה, אופטימיזציה של תכנים, אבטחת מידע ומניעת שימוש לרעה באתר.
              </p>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Cookie className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                3. עוגיות (Cookies) וכלי ניתוח צד שלישי (GA4)
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                3.1. <strong>מהן עוגיות?</strong> &quot;עוגייה&quot; היא קובץ טקסט קטן שהדפדפן שלך שומר על גבי המכשיר.
              </p>
              <p>
                3.2. <strong>Google Analytics 4 (GA4):</strong> האתר עושה שימוש בכלי המדידה של חברת Google לצורך מדידה סטטיסטית אנונימית של תנועת הגולשים. הנתונים הנאספים על ידי Google כפופים למדיניות הפרטיות של Google.
              </p>
              <p>
                3.3. <strong>עוגיות שותפים (Affiliate Cookies):</strong> בעת לחיצה על קישור למוצר באתר עלי אקספרס, מופעל קישור של תוכנית השותפים AliExpress Portals. פלטפורמת עלי אקספרס עשויה להטמיע עוגייה בדפדפן לצורך ייחוס רכישה, בהתאם למדיניות הפרטיות של Alibaba Group.
              </p>
              <p>
                3.4. <strong>שליטה בעוגיות:</strong> באפשרותך לשנות בכל עת את הגדרות הדפדפן שלך כדי לחסום עוגיות או לקבל התראה לפני שמירתן. לתשומת לבך, חסימת עוגיות עשויה להשפיע על חוויית הגלישה באתרים שונים ברשת.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <ExternalLink className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                4. קישורים לפלטפורמות ואתרים חיצוניים
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                4.1. אתר AliDeals מפנה באמצעות קישורים ישירים לפלטפורמת AliExpress ולאתרים חיצוניים נוספים ברשת.
              </p>
              <p>
                4.2. הנהלת האתר אינה מפקחת ואינה נושאת בכל אחריות למדיניות הפרטיות, לאבטחת המידע, או לנהלי איסוף המידע של אתרים חיצוניים אלו.
              </p>
              <p>
                4.3. אנו ממליצים לכל משתמש לעיין במדיניות הפרטיות ותנאי השימוש של כל אתר צד שלישי שאליו הוא מופנה לפני מסירת מידע אישי או ביצוע רכישה.
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Server className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                5. מסירת מידע לצדדים שלישיים
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                5.1. הנהלת האתר <strong>אינה מוכרת, אינה משכירה ואינה סוחרת במידע אישי</strong> של גולשי האתר לכל צד שלישי לצרכי דיוור ישיר או שיווק.
              </p>
              <p>
                5.2. מידע טכני או אנליטי יימסר אך ורק במקרים המוגדרים הבאים:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pr-2 text-slate-600">
                <li>לספקי שירותים טכנולוגיים ותשתיות אחסון מאובטחות המסייעים בתפעול השוטף של האתר.</li>
                <li>במידה ויתקבל צו שיפוטי מרשות מוסמכת או הוראה חוקית המחייבת מסירת מידע על פי דין.</li>
                <li>במקרה של סכסוך משפטי, הליך משפטי, או טענה להפרת תנאי השימוש באתר, להגנה על זכויות הנהלת האתר.</li>
              </ul>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Lock className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                6. אבטחת מידע
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                6.1. האתר מיישם מערכות ונהלים מקובלים לאבטחת מידע, לרבות הצפנת תעבורה באמצעות פרוטוקול SSL/TLS (HTTPS) בתקן מחמיר.
              </p>
              <p>
                6.2. על אף שאמצעי אבטחה אלו מצמצמים משמעותית את הסיכונים לחדירה בלתי מורשית, אין מערכת מחשוב או רשת אינטרנט חסינה לחלוטין. לפיכך, הנהלת האתר אינה מתחייבת כי מערכות האתר יהיו חסינות באופן מוחלט מפני כל גישה בלתי מורשית או מתקפת סייבר.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <FileCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                7. זכויות המשתמש ועדכון המדיניות
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                7.1. בהתאם לחוק הגנת הפרטיות, התשמ&quot;א-1981, הנך זכאי לעיין במידע המוחזק עליך (ככל שקיים מידע מזוהה כזה) ולבקש לתקנו או למוחקו.
              </p>
              <p>
                7.2. הנהלת האתר רשאית לעדכן מדיניות פרטיות זו מעת לעת בהתאם לשינויי חקיקה, רגולציה או עדכונים טכנולוגיים באתר. הנוסח העדכני ביותר המופיע בעמוד זה הוא המחייב.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Mail className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                8. יצירת קשר בנושאי פרטיות
              </h2>
            </div>
            <p className="mb-4">
              לכל שאלה, בקשה להבהרה או פנייה בנוגע למדיניות הפרטיות ואבטחת המידע באתר, ניתן לפנות אל ממונה הפרטיות של האתר בכתובת:
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 font-mono text-xs sm:text-sm text-slate-800 border border-slate-200">
              <span>privacy@ali-deals.co.il</span>
            </div>
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
