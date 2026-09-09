import { Metadata } from "next";
import Link from "next/link";
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Scale,
  ShoppingBag,
  HelpCircle,
  ChevronLeft,
  DollarSign,
  ExternalLink,
  Ban,
  Building,
} from "lucide-react";

export const metadata: Metadata = {
  title: "תנאי שימוש והגבלת אחריות",
  description:
    "תנאי השימוש, כתב ויתור והגבלת אחריות של פורטל AliDeals ישראל. מידע מפורט על אופי האתר כפלטפורמת תוכן והשוואות, קישורי שותפים, ומדיניות יבוא אישי.",
  alternates: {
    canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/terms`,
  },
  openGraph: {
    title: "תנאי שימוש והגבלת אחריות | AliDeals ישראל",
    description:
      "תנאי השימוש, כתב ויתור והגבלת אחריות של פורטל AliDeals ישראל.",
    url: `${process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il"}/terms`,
    siteName: "AliDeals ישראל",
    locale: "he_IL",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "תנאי שימוש והגבלת אחריות | AliDeals ישראל",
    description: "תנאי השימוש וכתב הוויתור של פורטל AliDeals ישראל.",
  },
};

export default function TermsPage() {
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
          <span className="text-slate-800 font-medium">תנאי שימוש</span>
        </nav>

        {/* Header Banner */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-sm mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-ali-50 text-ali-700 border border-ali-200 mb-4">
            <Scale className="w-3.5 h-3.5" />
            <span>הסכם משפטי מחייב</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mb-3">
            תנאי שימוש והגבלת אחריות – AliDeals
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
            ברוכים הבאים לפורטל <strong>AliDeals</strong> (להלן: &quot;האתר&quot; או &quot;הנהלת האתר&quot;). השימוש באתר, לרבות גלישה, קריאת סקירות, צפייה בטבלאות השוואת TOP 5 ושימוש במחשבונים או בקישורים המופיעים בו, כפוף להסכמתך המלאה לתנאים המפורטים להלן.
          </p>
          <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
            <span>עדכון אחרון: {lastUpdated}</span>
            <span>תחום שיפוט: מדינת ישראל בלבד</span>
          </div>
        </div>

        {/* Important Warning Notice */}
        <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-5 mb-8 flex items-start gap-3 text-amber-900 text-xs sm:text-sm leading-relaxed">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <strong className="font-bold block mb-1">תמצית חשובה לקורא:</strong>
            AliDeals הוא פורטל תוכן והשוואות צרכניות ו<strong>אינו חנות מקוונת, אינו יבואן, ואינו גובה כספים עבור מוצרים</strong>. כל הרכישות מתבצעות ישירות באתר AliExpress או מול מוכרים עצמאיים, ובאחריותם הבלעדית. אנא קרא את התנאים המלאים להלן.
          </div>
        </div>

        {/* Main Content Sections */}
        <div className="space-y-6 text-slate-700 text-sm leading-relaxed">
          {/* Section 1 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <FileText className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                1. מהות האתר ואופי השירות
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                1.1. אתר AliDeals הינו אתר תוכן, מדריכי קנייה, סקירות עומק, השוואות מוצרים (טבלאות TOP 5), ואיתור דילים ומבצעים בפלטפורמות מסחר אלקטרוני בינלאומיות, ובראשן פלטפורמת AliExpress (להלן: &quot;עלי אקספרס&quot;).
              </p>
              <p>
                1.2. <strong>האתר אינו חנות מקוונת:</strong> האתר אינו מייצר, אינו מייבא, אינו משווק, אינו מחזיק במלאי, אינו אורז, אינו שולח, ואינו גובה תשלומים עבור מוצרים מכל מין וסוג. כל הפעולות הכספיות והלוגיסטיות מתבצעות באופן ישיר מול עלי אקספרס ו/או מוכרים עצמאיים הפועלים בה.
              </p>
              <p>
                1.3. השימוש באתר ובשירותיו מוצע כמות שהוא (&quot;AS IS&quot;) וללא כל התחייבות, מצג או אחריות מכל סוג שהוא מצד הנהלת האתר.
              </p>
            </div>
          </section>

          {/* Section 2 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <ExternalLink className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                2. התקשרות מול צדדים שלישיים (AliExpress ומוכרים עצמאיים)
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                2.1. לחיצה על קישורים באתר עשויה להעביר את המשתמש ישירות לאתר עלי אקספרס. כל רכישה שתבוצע על ידי המשתמש נעשית <strong>בינו לבין המוכר בעלי אקספרס בלבד</strong>, ובכפוף לתנאי השימוש, מדיניות הפרטיות ומדיניות הגנת הקונה (Buyer Protection) של עלי אקספרס.
              </p>
              <p>
                2.2. הנהלת האתר אינה צד, במישרין או בעקיפין, לכל עסקה, הזמנה או תקשורת בין המשתמש לבין עלי אקספרס או מוכרים כלשהם.
              </p>
              <p>
                2.3. הנהלת האתר אינה אחראית בשום אופן ל:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pr-2 text-slate-600">
                <li>איכות המוצרים, תקינותם, בטיחותם, עמידותם או תאימותם לציפיות המשתמש.</li>
                <li>אותנטיות המוצרים, מקוריותם, או הפרת זכויות קניין רוחני על ידי מוכרים צד שלישי.</li>
                <li>זמני שילוח, עיכובים באספקה, אובדן חבילות, נזק שנגרם בהובלה או טעויות בכתובת.</li>
                <li>מדיניות החזרות, החזרים כספיים, ביטולי עסקאות או מענה של שירות לקוחות המוכר/עלי אקספרס.</li>
                <li>תאימות המוצר לתקנים ישראליים או בינלאומיים (לרבות שקעי חשמל, תקני בטיחות, אישורי משרד התקשורת וכדומה).</li>
              </ul>
            </div>
          </section>

          {/* Section 3 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <DollarSign className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                3. גילוי נאות – תוכנית שותפים (Affiliate Disclosure)
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                3.1. בהתאם להנחיות הגנת הצרכן, רגולציית שיווק דיגיטלי והנחיות ה-FTC הבינלאומיות, אנו מצהירים בשקיפות מלאה: <strong>אתר AliDeals משתתף בתוכניות שותפים</strong>, ובראשן תוכנית השותפים הרשמית של עלי אקספרס (AliExpress Portals).
              </p>
              <p>
                3.2. המשמעות היא שחלק מהקישורים באתר מכילים קוד מעקב ייעודי. במידה ותקליקו על קישור ותרכשו מוצר בעלי אקספרס, הנהלת האתר עשויה לקבל עמלת הפניה צנועה מהפלטפורמה.
              </p>
              <p>
                3.3. <strong>עמלה זו אינה מייקרת את מחיר המוצר עבורכם בשום צורה</strong>, ובמקרים רבים האתר אף מאתר קופונים והנחות המוזילים את עלות הרכישה.
              </p>
              <p>
                3.4. המלצות האתר, הסקירות וטבלאות ה-TOP 5 נערכות על פי שיקולי עריכה, ניתוח מפרטים, שביעות רצון ביקורות צרכנים ושיקולים מקצועיים.
              </p>
            </div>
          </section>

          {/* Section 4 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                4. מחירים, קופונים, מלאי ושערי חליפין
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                4.1. מחירי המוצרים, קופוני ההנחה, מבצעי משלוח חינם וזמינות המלאי משתנים באופן תדיר ודינמי על ידי המוכרים בעלי אקספרס, ללא כל שליטה או הודעה מוקדמת להנהלת האתר.
              </p>
              <p>
                4.2. המחירים המוצגים באתר (בדולר או בשקלים) הם <strong>אינדיקטיביים בלבד</strong>, ונכונים לרגע איסוף המידע. תנודות בשערי מטבע חוץ (USD/ILS) והמרות מטבע של חברות האשראי עשויות להשפיע על החיוב בפועל.
              </p>
              <p>
                4.3. <strong>המחיר והתנאים הקובעים והמחייבים הם אך ורק אלו המופיעים בעמוד התשלום הסופי (Checkout) באתר עלי אקספרס במועד ביצוע ההזמנה.</strong>
              </p>
            </div>
          </section>

          {/* Section 5 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Building className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                5. יבוא אישי, מיסוי, מכס ורגולציה בישראל
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                5.1. כל הזמנת מוצר על ידי המשתמש מחו&quot;ל מהווה פעולה של &quot;יבוא אישי&quot; באחריותו הבלעדית של המשתמש, בכפוף לפקודת המכס, חוק מע&quot;מ, וצו יבוא אישי (הוראת שעה).
              </p>
              <p>
                5.2. המשתמש אחראי בלעדית לבדוק האם חלים על חבילתו מיסי יבוא, מע&quot;מ (מעל תקרת ה-75 דולר ארה&quot;ב), מס קנייה, אגרות שחרור חבילה של דואר ישראל או חברות בלדרות (כגון DHL, FedEx, UPS וכו&quot;).
              </p>
              <p>
                5.3. כמו כן, המשתמש אחראי לבדוק האם המוצר דורש אישור מיוחד מרשות מוסמכת בישראל (לדוגמה: אישור משרד התקשורת למכשירי שידור אלחוטיים, אישור מכון התקנים, משרד התחבורה לחלקי רכב, משרד הבריאות וכדומה).
              </p>
              <p>
                5.4. מחשבון המכס והמדריכים המופיעים באתר הינם כלי עזר חישוביים להמחשה בלבד, ואינם מהווים ייעוץ משפטי, כלכלי או עמילות מכס. הנהלת האתר אינה נושאת בכל אחריות לדרישות תשלום, היטלים, קנסות או החרמת חבילות על ידי רשות המיסים והמכס.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                6. הגבלת אחריות מוחלטת (Limitation of Liability)
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                6.1. במידה המרבית המותרת על פי הדין החל בישראל, הנהלת האתר, בעליו, מפעיליו, מפתחיו וכותבי התכנים בו לא יישאו בכל אחריות לכל נזק מכל סוג שהוא, לרבות נזק ישיר, עקיף, תוצאתי, נלווה, עונשי או מיוחד (לרבות אובדן רווחים, אובדן מידע, פגיעה במוניטין, עוגמת נפש או נזק גוף ורכוש), הנובע מ:
              </p>
              <ul className="list-disc list-inside space-y-1.5 pr-2 text-slate-600">
                <li>השימוש באתר, חוסר יכולת להשתמש באתר, או תקלות טכניות וזמני השבתה.</li>
                <li>הסתמכות על מידע, סקירות, המלצות, השוואות או מחשבונים המוצגים באתר.</li>
                <li>רכישה, שימוש, תקלה או פגם במוצרים שנרכשו דרך קישורים לצדדים שלישיים.</li>
                <li>אי-דיוקים, השמטות או טעויות סופר בתכנים, במפרטים או במחירים.</li>
                <li>וירוסים, נוזקות או רכיבים מזיקים אחרים שעלולים להימצא ברשת האינטרנט.</li>
              </ul>
              <p>
                6.2. חלק מהתכנים והסקירות באתר מבוססים על ניתוח אנליטי, איסוף חוות דעת של אלפי קונים ומודלים של בינה מלאכותית (AI) לצורכי תמצות וסיכום. על אף המאמץ להביא מידע אמין ומדויק, המשתמש מצהיר כי הוא מבצע בדיקה עצמאית לפני כל החלטת רכישה.
              </p>
            </div>
          </section>

          {/* Section 7 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Ban className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                7. קניין רוחני ושימוש מותר
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                7.1. כל זכויות היוצרים, סימני המסחר, עיצובי הממשק, קוד המקור, הטקסטים, המאמרים, טבלאות ההשוואה והגרפיקות באתר הינם רכושה הבלעדי של הנהלת האתר (למעט לוגואים ותמונות מוצרים השייכים לבעלי הזכויות המקוריים או לעלי אקספרס ומוצגים לצורך סקירה ושימוש הוגן).
              </p>
              <p>
                7.2. חל איסור מוחלט להעתיק, לשכפל, להפיץ, לפרסם, לתרגם, לשדר, לבצע הנדסה לאחור או להציג בפומבי כל חלק מהאתר ללא קבלת אישור מפורש מראש ובכתב מהנהלת האתר.
              </p>
              <p>
                7.3. חל איסור להפעיל &quot;בוטים&quot;, סורקים אוטומטיים (Scrapers/Crawlers) לכריית מידע מסחרית או להעמסה על שרתי האתר, למעט סורקי מנועי חיפוש מקובלים (Google, Bing וכיו&quot;ב) הפועלים בהתאם לקובץ robots.txt.
              </p>
            </div>
          </section>

          {/* Section 8 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <Scale className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                8. שיפוי, ברירת דין וסמכות שיפוט
              </h2>
            </div>
            <div className="space-y-3">
              <p>
                8.1. <strong>שיפוי:</strong> המשתמש מתחייב לשפות ולפצות את הנהלת האתר, בעליו, מנהליו ועובדיו בגין כל תביעה, דרישה, נזק, הפסד או הוצאה (לרבות שכר טרחת עורכי דין) שייגרמו להם כתוצאה מהפרת תנאי שימוש אלו על ידו או משימוש בלתי חוקי באתר.
              </p>
              <p>
                8.2. <strong>ברירת הדין:</strong> על תנאי שימוש אלו ועל כל הנובע מהם או מהשימוש באתר יחולו אך ורק דיני מדינת ישראל, ללא תחולה לכללי ברירת הדין הבינלאומיים.
              </p>
              <p>
                8.3. <strong>סמכות שיפוט בלעדית:</strong> סמכות השיפוט הבלעדית והייחודית בכל סכסוך, תביעה או מחלוקת הנוגעים לאתר תהא מסורה לבתי המשפט המוסמכים בעיר תל אביב-יפו בלבד.
              </p>
              <p>
                8.4. הנהלת האתר שומרת לעצמה את הזכות לשנות, לעדכן או להוסיף על תנאי שימוש אלו בכל עת, לפי שיקול דעתה הבלעדי. הנוסח המפורסם באתר במועד השימוש הוא המחייב.
              </p>
            </div>
          </section>

          {/* Section 9 */}
          <section className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-ali-50 flex items-center justify-center text-ali-600">
                <HelpCircle className="w-4 h-4" />
              </div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                9. יצירת קשר עם הנהלת האתר
              </h2>
            </div>
            <p className="mb-4">
              בכל שאלה, הבהרה, דיווח על תקלה טכנית או פנייה בנוגע לתנאי השימוש, ניתן לפנות אל צוות האתר בדואר אלקטרוני:
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 font-mono text-xs sm:text-sm text-slate-800 border border-slate-200">
              <span>contact@ali-deals.co.il</span>
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
