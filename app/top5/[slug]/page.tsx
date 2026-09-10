import { notFound } from "next/navigation";
import Link from "next/link";
import { Metadata } from "next";
import { jsonDb } from "@/lib/db";
import DirectAnswerBox from "@/components/DirectAnswerBox";
import ComparisonTable from "@/components/ComparisonTable";
import FaqAccordion from "@/components/FaqAccordion";
import MarkdownContent from "@/components/MarkdownContent";
import { ChevronLeft, Award, HelpCircle } from "lucide-react";
import { AliExpressProduct } from "@/lib/aliexpress/types";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface Top5PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Top5PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = jsonDb.getPageBySlug(slug);

  if (!page) {
    return { title: "השוואת מוצרים לא נמצאה" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";
  const canonicalUrl = `${baseUrl}/top5/${page.slug}`;
  const ogImage = page.featuredImage || `${baseUrl}/og-image.jpg`;

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
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
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      images: [ogImage],
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
  const matchedProducts = allProducts.filter((p) => productIds.includes(p.id) || productIds.includes(p.aliId));

  const mappedProducts: AliExpressProduct[] = (matchedProducts.length > 0 ? matchedProducts : allProducts.slice(0, 5)).map((p: any) => ({
    aliId: p.aliId,
    originalTitle: p.originalTitle,
    titleHe: p.titleHe || p.originalTitle,
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
    affiliateUrl: p.affiliateUrl || p.aliUrl,
  }));

  const badges = [
    "בחירת העורכים",
    "התמורה הטובה למחיר",
    "הבחירה התקציבית",
    "הבחירה הפרימיום",
    "הבחירה הפופולרית",
    "עיצוב וחדשנות",
    "ביצועים מובילים",
    "אמינות ועמידות",
    "בחירת הקהל",
    "ציון לשבח",
  ];
  const rankings = mappedProducts.map((p, idx) => ({
    rank: idx + 1,
    badge: badges[idx] || "מומלץ",
    titleHe: (p.titleHe || p.originalTitle).slice(0, 70),
    keyHighlight: `ציון מעולה של ${p.rating} כוכבים במחיר של כ-$${p.priceUsd}`,
    verdict: `דגם מוביל ומבוקש באלי אקספרס.`,
  }));

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  // Comprehensive Schema.org Graph for Google Rich Snippets & AI GEO
  const top5RichSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ItemList",
        "name": page.title,
        "description": page.metaDescription,
        "itemListElement": mappedProducts.map((prod, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": prod.originalTitle,
          "image": prod.mainImage,
          "url": prod.affiliateUrl || prod.aliUrl || `${baseUrl}/top5/${page.slug}`,
        })),
      },
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "עמוד הבית",
            "item": baseUrl,
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": "טבלאות TOP 5",
            "item": `${baseUrl}/#top5`,
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": page.title,
            "item": `${baseUrl}/top5/${page.slug}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "האם המוצרים בהשוואה בטוחים להזמנה לישראל?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "כן, כל המוצרים ברשימה נבחרו ממוכרים בדירוג גבוה עם מאות עד אלפי הזמנות מאומתות ומשלוח מעקב מסודר.",
            },
          },
          {
            "@type": "Question",
            "name": "מהו רף המס על המוצרים בהשוואה?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "כל מוצר שמחירו מתחת ל-$75 פטור ממע\"מ ומכס בישראל. אם מזמינים מספר מוצרים שעוברים יחד את הרף, מומלץ לבצע הזמנות נפרדות בהפרש של מספר ימים.",
            },
          },
          {
            "@type": "Question",
            "name": "איך בוחרים את הדגם הנכון ביותר מבין האפשרויות?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "מומלץ לבחון את תגית 'בחירת העורכים' עבור המוצר המאוזן ביותר, או את 'הבחירה התקציבית' עבור המחיר הנמוך ביותר.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      {/* Schema.org JSON-LD (ItemList + Breadcrumbs + FAQPage) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(top5RichSchema) }}
      />

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
        <article className="prose prose-slate max-w-none">
          <MarkdownContent content={page.contentMarkdown} />
        </article>

        {/* Interactive FAQ Section */}
        <FaqAccordion
          title="שאלות נפוצות על המוצרים בהשוואה"
          items={[
            {
              question: "האם המוצרים בהשוואה בטוחים להזמנה לישראל?",
              answer: "כן, כל המוצרים ברשימה נבחרו ממוכרים בדירוג גבוה עם מאות עד אלפי הזמנות מאומתות ומשלוח מעקב מסודר.",
            },
            {
              question: "מהו רף המס על המקרנים בהשוואה?",
              answer: "כל מוצר שמחירו מתחת ל-$75 פטור ממע\"מ ומכס. אם מזמינים מספר מוצרים שעוברים יחד את הרף, מומלץ לבצע הזמנות נפרדות בהפרש של מספר ימים.",
            },
            {
              question: "איך בוחרים את הדגם הנכון ביותר עבורי?",
              answer: "אם אתם מחפשים את התמורה הטובה ביותר למחיר לחדר שינה, Magcubic HY300 הוא הבחירה המומלצת בזכות זווית ההקרנה הגמישה ל-180 מעלות ואנדרואיד מובנה.",
            },
          ]}
        />
      </div>
    </>
  );
}
