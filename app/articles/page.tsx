import { Metadata } from "next";
import Link from "next/link";
import { supabaseDb, PageRecord } from "@/lib/db";
import ArticlesHubClient from "@/components/articles/ArticlesHubClient";
import { BookOpen, Sparkles, ChevronLeft } from "lucide-react";

export const revalidate = 900; // ISR — רענון כל 15 דקות

export const metadata: Metadata = {
  title: "מדריכי קנייה, מכס ומאמרי צרכנות | AliDeals ישראל",
  description:
    "כל מה שצריך לדעת על קניות חכמות באלי אקספרס: תקנות מכס ומיסוי 2026, פסטיבלי הנחות (11.11, בלאק פרייד), המרת מידות אופנה, זיהוי מוכרים אמינים ומדריכים טכנולוגיים.",
  alternates: {
    canonical: "https://ali-deals.co.il/articles",
  },
  openGraph: {
    title: "מדריכי קנייה, מכס ומאמרי צרכנות | AliDeals ישראל",
    description:
      "מדריכי צרכנות מעמיקים, טיפים שחוסכים כסף וסקירות רוחביות לקונים ישראלים באלי אקספרס.",
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
      <section className="bg-gradient-to-b from-slate-50 via-indigo-50/20 to-white py-12 sm:py-16 border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          {/* Breadcrumbs */}
          <nav aria-label="פירורי לחם" className="flex items-center gap-2 text-xs text-slate-500 mb-4">
            <Link href="/" className="hover:text-slate-900 transition-colors">
              דף הבית
            </Link>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-bold">מדריכים ומאמרי צרכנות</span>
          </nav>

          <div className="max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-extrabold text-xs">
              <BookOpen className="w-3.5 h-3.5" />
              <span>מרכז הידע של AliDeals</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-slate-950 tracking-tight leading-tight">
              מדריכי קנייה, טיפים ותחקירי צרכנות
            </h1>

            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-normal">
              כל הידע, הכללים והטיפים הסודיים שיעזרו לך לקנות חכם, לחסוך עשרות אחוזים ולהימנע מטעויות בקניות מסין.
            </p>
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
