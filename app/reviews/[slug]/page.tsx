import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { jsonDb } from "@/lib/db";
import DirectAnswerBox from "@/components/DirectAnswerBox";
import ProsConsBox from "@/components/ProsConsBox";
import StickyBuyBar from "@/components/StickyBuyBar";
import InfographicViewer from "@/components/InfographicViewer";
import CouponBox from "@/components/CouponBox";
import { Star, ShieldCheck, ShoppingCart, ChevronLeft, Check, HelpCircle } from "lucide-react";

interface ReviewPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const reviews = jsonDb.getPagesByType("review");
  return reviews.map((page) => ({
    slug: page.slug,
  }));
}

export async function generateMetadata({ params }: ReviewPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = jsonDb.getPageBySlug(slug);

  if (!page) {
    return { title: "סקירה לא נמצאה" };
  }

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    openGraph: {
      title: page.metaTitle || page.title,
      description: page.metaDescription,
      images: page.featuredImage ? [{ url: page.featuredImage }] : [],
      type: "article",
      locale: "he_IL",
    },
    alternates: {
      canonical: `${process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"}/reviews/${page.slug}`,
    },
  };
}

export default async function ReviewPage({ params }: ReviewPageProps) {
  const { slug } = await params;
  const page = jsonDb.getPageBySlug(slug);

  if (!page) {
    notFound();
  }

  // Load product data
  let productIds: string[] = [];
  try {
    productIds = JSON.parse(page.productIds || "[]");
  } catch {
    // ignore
  }

  const firstAliId = productIds[0];
  const prod = firstAliId ? jsonDb.getProductByAliId(firstAliId) : null;

  // Defaults if product record isn't linked
  const priceUsd = prod?.priceUsd || 29.99;
  const priceIls = prod?.priceIls || Math.round(priceUsd * 3.65);
  const rating = prod?.rating || 4.8;
  const ordersCount = prod?.ordersCount || 350;
  const mainImage = prod?.mainImage || page.featuredImage || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800";
  const isTaxExempt = priceUsd < 75;

  // Parse specifications
  let specifications: Record<string, string> = {};
  if (prod?.specifications) {
    try {
      specifications = JSON.parse(prod.specifications);
    } catch {
      // ignore
    }
  }

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
  const destinationUrl = prod?.affiliateUrl || prod?.aliUrl || `https://www.aliexpress.com/item/${firstAliId}.html`;

  return (
    <>
      {/* Schema.org JSON-LD */}
      {page.structuredDataJson && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: page.structuredDataJson }}
        />
      )}

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
            {page.title}
          </h1>
        </header>

        {/* GEO Direct Answer Block (AI search quotation hook) */}
        {page.directAnswerGeo && (
          <DirectAnswerBox answerText={page.directAnswerGeo} />
        )}

        {/* Main Product Showcase Card */}
        <div className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Gallery Image */}
          <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
            <Image
              src={mainImage}
              alt={page.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 50vw"
              priority
            />
            {prod?.discountPercent ? (
              <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                -{prod.discountPercent}%
              </span>
            ) : null}
          </div>

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

            {/* Big Purchase CTA Button */}
            <a
              href={destinationUrl}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-bold text-base shadow-lg shadow-ali-500/25 transition-all"
            >
              <ShoppingCart className="w-5 h-5" />
              <span>לרכישה במחיר המבצע באלי אקספרס</span>
            </a>
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
        <article className="prose prose-slate max-w-none prose-headings:font-bold prose-headings:text-slate-900 prose-p:leading-relaxed prose-p:text-slate-700 prose-a:text-ali-600">
          <div className="whitespace-pre-line text-slate-800 leading-relaxed space-y-4">
            {page.contentMarkdown}
          </div>
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

        {/* FAQ Section */}
        <section className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="w-5 h-5 text-ali-600" />
            <h3 className="text-lg font-bold text-slate-900">שאלות נפוצות ותשובות לקונים בישראל</h3>
          </div>

          <div className="space-y-4 divide-y divide-slate-100 text-sm">
            <div className="pt-3 space-y-1">
              <h4 className="font-bold text-slate-900">האם יש תשלום מכס נוסף בהגעה לישראל?</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                {isTaxExempt
                  ? "לא. כל מוצר שמחירו נמוך מ-75 דולר (ללא עלות המשלוח) פטור לחלוטין ממע\"מ ומכס בישראל."
                  : "מחיר המוצר מעל 75 דולר, ולכן ייתכן חיוב במע\"מ בשיעור 17% בעת שחרור החבילה בארץ."}
              </p>
            </div>
            <div className="pt-3 space-y-1">
              <h4 className="font-bold text-slate-900">כמה זמן לוקח לחבילה להגיע?</h4>
              <p className="text-slate-600 text-xs leading-relaxed">
                בבחירת משלוח רשמי (AliExpress Standard Shipping), זמני ההגעה הממוצעים עומדים על 7 עד 14 ימי עסקים.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* Floating Sticky Buy Bar */}
      <StickyBuyBar
        productId={prod?.aliId || firstAliId || ""}
        pageId={page.id}
        title={page.title}
        priceIls={priceIls}
        priceUsd={priceUsd}
        mainImage={mainImage}
      />
    </>
  );
}
