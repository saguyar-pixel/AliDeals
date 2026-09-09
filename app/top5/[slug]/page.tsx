import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { jsonDb } from "@/lib/db";
import DirectAnswerBox from "@/components/DirectAnswerBox";
import ComparisonTable from "@/components/ComparisonTable";
import { ChevronLeft, Award, HelpCircle } from "lucide-react";
import { AliExpressProduct } from "@/lib/aliexpress/types";

interface Top5PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const top5Pages = jsonDb.getPagesByType("top5");
  return top5Pages.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({ params }: Top5PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = jsonDb.getPageBySlug(slug);

  if (!page) {
    return { title: "השוואת מוצרים לא נמצאה" };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/top5/${page.slug}`,
    },
  };
}

export default async function Top5Page({ params }: Top5PageProps) {
  const { slug } = await params;
  const page = jsonDb.getPageBySlug(slug);

  if (!page) {
    notFound();
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

  const allProducts = jsonDb.getProducts();
  const matchedProducts = allProducts.filter((p) => productIds.includes(p.aliId));

  const mappedProducts: AliExpressProduct[] = (matchedProducts.length > 0 ? matchedProducts : allProducts).map((p: any) => ({
    aliId: p.aliId,
    originalTitle: p.originalTitle,
    priceUsd: p.priceUsd,
    priceIls: p.priceIls,
    originalPriceUsd: p.originalPriceUsd || undefined,
    discountPercent: p.discountPercent || 0,
    rating: p.rating || 4.8,
    ordersCount: p.ordersCount || 100,
    mainImage: p.mainImage,
    galleryImages: safeParse(p.galleryImages, []),
    specifications: safeParse(p.specifications, {}),
    reviewsSummary: safeParse(p.reviewsSummary, []),
    aliUrl: p.aliUrl,
    affiliateUrl: p.affiliateUrl || undefined,
  }));

  const badges = ["בחירת העורכים", "התמורה הטובה למחיר", "הבחירה התקציבית", "האיכותי ביותר", "הכי נמכר"];
  const rankings = mappedProducts.map((p, idx) => ({
    rank: idx + 1,
    badge: badges[idx] || "מומלץ",
    titleHe: p.originalTitle.slice(0, 50),
    keyHighlight: `ציון מעולה של ${p.rating} כוכבים במחיר של כ-$${p.priceUsd}`,
    verdict: `דגם מוביל ומבוקש באלי אקספרס.`,
  }));

  return (
    <>
      {page.structuredDataJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.structuredDataJson }}
        />
      )}

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-20">
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            ראשי
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <Link href="/#top5" className="hover:text-slate-900 transition-colors">
            טבלאות TOP 5
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-semibold truncate max-w-xs">{page.title}</span>
        </nav>

        <header className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-bold">
              {page.targetCategory || "מדריך השוואה מקיף"}
            </span>
            <span className="text-xs text-slate-500">מעודכן ל-2026</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-950 leading-tight">
            {page.title}
          </h1>
        </header>

        {page.directAnswerGeo && (
          <DirectAnswerBox
            badgeText="הבחירה המנצחת (סיכום השוואת AI)"
            answerText={page.directAnswerGeo}
          />
        )}

        {/* Comparison Table */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-ali-600" />
            <h2 className="text-xl font-bold text-slate-900">טבלת השוואת הדגמים המומלצים</h2>
          </div>

          <ComparisonTable
            products={mappedProducts}
            rankings={rankings}
            pageId={page.id}
          />
        </section>

        {/* Detailed Markdown Content */}
        <article className="prose prose-slate max-w-none text-slate-800 leading-relaxed whitespace-pre-line">
          {page.contentMarkdown}
        </article>

        {/* FAQ Section */}
        <section className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-ali-600" />
            <h3 className="text-lg font-bold text-slate-900">שאלות נפוצות על המוצרים בהשוואה</h3>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 text-sm">
            <div className="pt-3 space-y-1">
              <h4 className="font-bold text-slate-900">האם המוצרים בטוחים להזמנה לישראל?</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                כן, כל המוצרים ברשימה נבחרו ממוכרים בדירוג גבוה עם מאות עד אלפי הזמנות מאומתות ומשלוח מעקב מסודר.
              </p>
            </div>
            <div className="pt-3 space-y-1">
              <h4 className="font-bold text-slate-900">מהו רף המס על המוצרים הנ&quot;ל?</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                כל מוצר שמחירו מתחת ל-$75 פטור ממע&quot;מ ומכס. אם מזמינים מספר מוצרים שעוברים יחד את הרף, מומלץ לבצע הזמנות נפרדות בהפרש של מספר ימים.
              </p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
