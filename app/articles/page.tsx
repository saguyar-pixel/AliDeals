import { Metadata } from "next";
import Link from "next/link";
import { supabaseDb, PageRecord } from "@/lib/db";
import ArticlesHubClient from "@/components/articles/ArticlesHubClient";
import { BookOpen, Sparkles, ChevronLeft } from "lucide-react";

export const revalidate = 900; // ISR — רענון כל 15 דקות

export const metadata: Metadata = {
  title: "הבלוג של רוֹן: מדריכי קנייה, מכס ומאמרי צרכנות | AliDeals",
  description:
    "הבלוג הרשמי של רוֹן ב-AliDeals ישראל: תחקירי צרכנות מעמיקים, תקנות מכס ומיסוי 2026, פסטיבלי הנחות (11.11, בלאק פרייד), המרת מידות, זיהוי מוכרים אמינים ומדריכי קנייה חכמים.",
  alternates: {
    canonical: "https://ali-deals.co.il/articles",
  },
  openGraph: {
    title: "הבלוג של רוֹן: מדריכי קנייה ומאמרי צרכנות | AliDeals ישראל",
    description:
      "תחקירי עומק, סקירות מוצרים ומדריכי צרכנות של רוֹן לקונים ישראלים באלי אקספרס.",
    url: "https://ali-deals.co.il/articles",
    siteName: "AliDeals ישראל",
    type: "website",
    locale: "he_IL",
  },
};

export default async function ArticlesPage() {
  let allPages: PageRecord[] = [];
  try {
    allPages = await supabaseDb.getPages();
  } catch (err) {
    console.warn("Failed to fetch pages for articles hub:", err);
  }

  // Filter published articles and guides
  const publishedArticles = allPages
    .filter(
      (p) =>
        p.status === "published" &&
        (p.type === "article" || p.type === "guide" || p.type === "top5")
    )
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return dateB - dateA;
    });

  // Extract unique categories
  const categoriesSet = new Set<string>();
  publishedArticles.forEach((a) => {
    if (a.targetCategory && a.targetCategory.trim()) {
      categoriesSet.add(a.targetCategory.trim());
    }
  });
  const allCategories = Array.from(categoriesSet);

  return (
    <main className="min-h-screen bg-white text-slate-900 pb-20" dir="rtl">
      {/* Hero Header */}
      <section className="bg-gradient-to-b from-slate-50 via-indigo-50/20 to-white py-10 sm:py-14 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Breadcrumbs */}
          <nav aria-label="פירורי לחם" className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              דף הבית
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold">הבלוג ומדריכי רוֹן</span>
          </nav>

          <div className="space-y-4 max-w-4xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-indigo-100 to-amber-100 border border-indigo-200/60 text-indigo-900 font-extrabold text-xs shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>הבלוג ומדריכי הצרכנות של רוֹן</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              הבלוג של רוֹן: מדריכי קנייה, סקירות ומבצעים
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              תחקירי עומק, סקירות מוצרים, בדיקות תקע ומתח (EU Plug & 220V), מדריכי מכס וטיפים סודיים לחסכון מקסימלי בקניות באלי אקספרס בישראל.
            </p>

            {/* Author / Persona Card */}
            <div className="mt-4 p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/90 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-ali-600 to-indigo-600 flex items-center justify-center text-white text-base font-black shadow-md shrink-0">
                  רוֹן
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-extrabold text-sm text-slate-900">רוֹן - סוכן הצרכנות הראשי</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-[10px]">
                      מומחה רכש ועלי אקספרס
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    בודק עבורכם מפרטים, תאימות לישראל ואיכות מוצרים לפני שאתם מזמינים
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-600 border-t sm:border-t-0 sm:border-r border-slate-100 pt-2 sm:pt-0 sm:pr-4 w-full sm:w-auto justify-around sm:justify-start">
                <div className="text-center sm:text-right">
                  <div className="font-black text-slate-900 text-sm">{publishedArticles.length}</div>
                  <div className="text-[10px] text-slate-400">מאמרים ומדריכים</div>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-center sm:text-right">
                  <div className="font-black text-slate-900 text-sm">2026</div>
                  <div className="text-[10px] text-slate-400">מעודכן ומאומת</div>
                </div>
                <div className="h-6 w-px bg-slate-200" />
                <div className="text-center sm:text-right">
                  <div className="font-black text-slate-900 text-sm">$75</div>
                  <div className="text-[10px] text-slate-400">פטור ממכס</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content & Articles Hub */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10">
        <ArticlesHubClient
          articles={publishedArticles}
          allCategories={allCategories}
        />
      </section>
    </main>
  );
}
