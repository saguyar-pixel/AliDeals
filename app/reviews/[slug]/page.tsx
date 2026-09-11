import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { jsonDb, supabaseDb } from "@/lib/db";
import DirectAnswerBox from "@/components/DirectAnswerBox";
import ProsConsBox from "@/components/ProsConsBox";
import StickyBuyBar from "@/components/StickyBuyBar";
import InfographicViewer from "@/components/InfographicViewer";
import CouponBox from "@/components/CouponBox";
import FaqAccordion from "@/components/FaqAccordion";
import PurchaseCtaButton from "@/components/PurchaseCtaButton";
import MarkdownContent from "@/components/MarkdownContent";
import { Star, ShieldCheck, ShoppingCart, ChevronLeft, Check, HelpCircle, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface ReviewPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await supabaseDb.getPageBySlug(slug);

  if (!page) {
    return { title: "סקירה לא נמצאה" };
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
  const canonicalUrl = `${baseUrl}/reviews/${page.slug}`;
  const ogImage = prod?.mainImage || page.featuredImage || `${baseUrl}/og-image.jpg`;

  const metaTitle = prod?.metaTitle || page.metaTitle || prod?.titleHe || page.title;
  const metaDescription = prod?.metaDescription || page.metaDescription;

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
          width: 800,
          height: 800,
          alt: prod?.titleHe || page.title,
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

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const page = await supabaseDb.getPageBySlug(slug);

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

  // Load canonical product entity data (matched by id or aliId)
  const productIds: string[] = safeParse(page.productIds, []);
  const firstId = productIds[0];
  const prod = firstId ? (await supabaseDb.getProductById(firstId) || await supabaseDb.getProductByAliId(firstId)) : null;
  const isProductActive = Boolean(prod);

  // Dynamic values reflecting canonical product entity updates
  const displayTitle = prod?.titleHe || prod?.originalTitle || page.title;
  const priceUsd = prod?.priceUsd ?? 29.99;
  const priceIls = prod?.priceIls ?? Math.round(priceUsd * 3.65);
  const rating = prod?.rating ?? 4.8;
  const ordersCount = prod?.ordersCount ?? 350;
  const mainImage = prod?.mainImage || page.featuredImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
  const isTaxExempt = priceUsd < 75;

  // Parse specifications
  const specifications: Record<string, string> = safeParse((prod as any)?.specifications, {});

  const pros = [
    `מחיר אטרקטיבי במיוחד ($${priceUsd}) ${isTaxExempt ? "- פטור מלא ממכס ומע\"מ בישראל" : ""}`,
    `איכות מעולה ביחס למחיר עם דירוג ממוצע של ${rating} כוכבים`,
    "תאימות מלאה לשקע חשמל אירופאי (EU) התואם לישראל",
  ];

  const cons = [
    "חוברת הוראות באנגלית/סינית בלבד",
    "זמן משלוח משוער של 8 עד 14 ימי עסקים בדואר רשום",
  ];

  // Static client-side affiliate redirect URL
  const destinationUrl = prod?.affiliateUrl || prod?.aliUrl || (firstId ? `https://www.aliexpress.com/item/${firstId}.html` : "https://www.aliexpress.com");

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il";

  // Comprehensive Schema.org Graph for Google Rich Snippets & AI GEO
  const richSchema = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        "name": prod?.titleHe || prod?.originalTitle || page.title,
        "image": mainImage,
        "description": prod?.metaDescription || page.metaDescription,
        "offers": {
          "@type": "Offer",
          "price": priceUsd.toString(),
          "priceCurrency": "USD",
          "availability": isProductActive ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          "url": destinationUrl,
        },
        "aggregateRating": {
          "@type": "AggregateRating",
          "ratingValue": rating.toString(),
          "reviewCount": ordersCount.toString(),
        },
        "review": {
          "@type": "Review",
          "reviewRating": {
            "@type": "Rating",
            "ratingValue": rating.toString(),
            "bestRating": "5",
          },
          "author": {
            "@type": "Organization",
            "name": "צוות המומחים של AliDeals",
          },
        },
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
            "name": "סקירות מוצרים",
            "item": `${baseUrl}/#reviews`,
          },
          {
            "@type": "ListItem",
            "position": 3,
            "name": page.title,
            "item": `${baseUrl}/reviews/${page.slug}`,
          },
        ],
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "האם יש תשלום מכס נוסף בהגעה לישראל?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": isTaxExempt
                ? "לא. כל מוצר שמחירו נמוך מ-75 דולר (ללא עלות המשלוח) פטור לחלוטין ממע\"מ ומכס בישראל."
                : "מחיר המוצר מעל 75 דולר, ולכן ייתכן חיוב במע\"מ בשיעור 17% בעת שחרור החבילה בארץ.",
            },
          },
          {
            "@type": "Question",
            "name": "כמה זמן לוקח לחבילה להגיע לישראל?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "בבחירת משלוח רשמי (AliExpress Standard Shipping), זמני ההגעה הממוצעים עומדים על 7 עד 14 ימי עסקים.",
            },
          },
          {
            "@type": "Question",
            "name": "איזה שקע חשמל מומלץ לבחור בהזמנה?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "מומלץ לבחור תמיד בתקע EU (אירופאי). תקע זה מתאים ישירות לשקעים בישראל ללא צורך במתאמים.",
            },
          },
        ],
      },
    ],
  };

  return (
    <>
      {/* Schema.org JSON-LD (Product + Breadcrumbs + FAQPage) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(richSchema) }}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-32">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            ראשי
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <Link href="/#reviews" className="hover:text-slate-900 transition-colors">
            סקירות
          </Link>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-slate-900 font-semibold truncate max-w-xs">{page.title}</span>
        </nav>

        {/* Header Title & Meta */}
        <header className="space-y-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="px-3 py-1 rounded-full bg-ali-50 text-ali-600 border border-ali-100 text-xs font-bold">
              {page.targetCategory || "סקירה רשמית"}
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500">עודכן לאחרונה: {new Date(page.updatedAt).toLocaleDateString("he-IL")}</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-slate-950 leading-tight">
            {displayTitle}
          </h1>
        </header>

        {/* Notice Banner if Product was deleted/inactive */}
        {!isProductActive && (
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold">מוצר זה הוסר ממאגר המוצרים / אינו זמין עוד באלי אקספרס</h4>
              <p className="text-xs text-amber-700 mt-1">
                הסקירה להלן נשמרת לצורכי השוואה ומידע. מומלץ לעבור לעמוד הבית או לקטגוריות לצפייה במוצרים מומלצים נוספים.
              </p>
            </div>
          </div>
        )}

        {/* GEO Direct Answer Block (AI search quotation hook) */}
        {page.directAnswerGeo && (
          <DirectAnswerBox answerText={page.directAnswerGeo} />
        )}

        {/* Main Product Showcase Card */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Gallery Image (Clickable to deal) */}
          <a
            href={destinationUrl}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="group relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 block hover:opacity-95 transition-opacity"
            title="לחץ לרכישה באלי אקספרס"
          >
            <Image
              src={mainImage}
              alt={displayTitle}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {prod?.discountPercent ? (
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                -{prod.discountPercent}%
              </span>
            ) : null}
          </a>

          {/* Product Details & Purchase Box */}
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span>{rating} / 5</span>
                </div>
                <span className="text-xs text-slate-400">•</span>
                <span className="text-xs text-slate-500">{ordersCount}+ רכשו בהצלחה</span>
              </div>

              <div className="pt-2 flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-black text-slate-950">₪{priceIls}</span>
                <span className="text-base font-semibold text-slate-500">(${priceUsd})</span>
              </div>
            </div>

            {/* Israeli Customs badge */}
            <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200/70 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                {isTaxExempt
                  ? "✓ פטור מלא ממכס ומע\"מ בישראל (המחיר נמוך מרף ה-$75)"
                  : "המחיר מעל $75 - ייתכן חיוב במע\"מ (17%) בכניסה לארץ"}
              </span>
            </div>

            {/* Quick Benefits Bullet points */}
            <ul className="space-y-2 text-xs text-slate-700">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>שקע אירופאי (EU Plug) מתאים לישראל</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>משלוח AliExpress Standard Shipping מבוטח</span>
              </li>
            </ul>

            {/* Big Purchase CTA Button (A/B Testable & Cloaked) */}
            {isProductActive ? (
              <PurchaseCtaButton
                productId={firstId || prod?.aliId || ""}
                productTitle={displayTitle}
                priceUsd={priceUsd}
                priceIls={priceIls}
                pageSlug={page.slug}
                source="review_card"
              />
            ) : (
              <div className="w-full text-center p-3.5 rounded-xl bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200">
                מוצר זה אינו זמין כעת לרכישה
              </div>
            )}
          </div>
        </div>

        {/* Optional Coupon Code Box */}
        <CouponBox couponCode="ALIBUY2026" discountText="קוד קופון בלעדי לרוכשים מישראל" />

        {/* Hebrew Infographic SVG Section */}
        {page.infographicImage && (
          <InfographicViewer svgContent={page.infographicImage} />
        )}

        {/* Honest Pros & Cons Component */}
        <ProsConsBox pros={pros} cons={cons} />

        {/* Detailed Review Content (Markdown parsed) */}
        <article className="prose prose-slate max-w-none">
          <MarkdownContent content={page.contentMarkdown} />
        </article>

        {/* Specifications Table */}
        {Object.keys(specifications).length > 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-lg font-bold text-slate-900">מפרט טכני מלא</h3>
            <div className="divide-y divide-slate-100 text-xs">
              {Object.entries(specifications).map(([key, value], idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-4">
                  <span className="font-semibold text-slate-500">{key}</span>
                  <span className="font-medium text-slate-900 text-left">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive FAQ Section */}
        <FaqAccordion
          title="שאלות נפוצות ותשובות לקונים בישראל"
          items={[
            {
              question: "האם יש תשלום מכס נוסף בהגעה לישראל?",
              answer: isTaxExempt
                ? "לא. כל מוצר שמחירו נמוך מ-75 דולר (ללא עלות המשלוח) פטור לחלוטין ממע\"מ ומכס בישראל."
                : "מחיר המוצר מעל 75 דולר, ולכן ייתכן חיוב במע\"מ בשיעור 17% בעת שחרור החבילה בארץ.",
            },
            {
              question: "כמה זמן לוקח לחבילה להגיע לישראל?",
              answer: "בבחירת משלוח רשמי (AliExpress Standard Shipping), זמני ההגעה הממוצעים עומדים על 7 עד 14 ימי עסקים.",
            },
            {
              question: "איזה שקע חשמל מומלץ לבחור בהזמנה?",
              answer: "מומלץ לבחור תמיד בתקע EU (אירופאי). תקע זה מתאים ישירות לשקעים בישראל ללא צורך במתאמים.",
            },
          ]}
        />
      </div>

      {/* Floating Sticky Buy Bar (Active Products only) */}
      {isProductActive && (
        <StickyBuyBar
          productId={prod?.aliId || firstId || ""}
          pageId={page.id}
          title={displayTitle}
          priceIls={priceIls}
          priceUsd={priceUsd}
          mainImage={mainImage}
          affiliateUrl={prod?.affiliateUrl || undefined}
          aliUrl={prod?.aliUrl || undefined}
        />
      )}
    </>
  );
}
