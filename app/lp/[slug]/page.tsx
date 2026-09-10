import { notFound } from "next/navigation";
import Image from "next/image";
import { Metadata } from "next";
import { jsonDb } from "@/lib/db";
import { ShoppingCart, ShieldCheck, Check, Star, Clock, Sparkles } from "lucide-react";
import PurchaseCtaButton from "@/components/PurchaseCtaButton";

interface LandingPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  const prod = jsonDb.getProductById(slug) || jsonDb.getProductByAliId(slug);

  if (!prod) {
    return { title: "דיל בלעדי | AliDeals" };
  }

  return {
    title: `מבצע מיוחד: ${prod.titleHe || prod.originalTitle} | AliDeals`,
    description: `מחיר מיוחד לרוכשים מישראל: ₪${prod.priceIls} ($${prod.priceUsd}). פטור ממכס ומשלוח ישיר.`,
    robots: { index: false, follow: true }, // Don't index campaign landing pages to prevent duplicate content
  };
}

export default async function FastLandingPage({ params }: LandingPageProps) {
  const { slug } = await params;
  const prod = jsonDb.getProductById(slug) || jsonDb.getProductByAliId(slug);

  if (!prod) {
    notFound();
  }

  const isTaxExempt = prod.priceUsd < 75;
  const displayTitle = prod.titleHe || prod.originalTitle;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between py-6 px-4 sm:px-6" dir="rtl">
      {/* Minimal Campaign Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-xl bg-ali-600 text-white flex items-center justify-center font-black text-sm">
            AD
          </span>
          <span className="font-black text-slate-900 text-base tracking-tight">AliDeals <span className="text-ali-600 text-xs font-bold">דיל מיוחד</span></span>
        </div>

        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold animate-pulse">
          <Clock className="w-3.5 h-3.5" />
          <span>מבצע מוגבל בזמן</span>
        </div>
      </header>

      {/* Main Conversion Card */}
      <main className="max-w-xl mx-auto w-full my-6 bg-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-200 space-y-6">
        {/* Gallery Image */}
        <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
          <Image
            src={prod.mainImage}
            alt={displayTitle}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 640px) 100vw, 560px"
          />
          {prod.discountPercent ? (
            <span className="absolute top-4 right-4 px-3 py-1 rounded-full bg-ali-600 text-white font-black text-sm shadow-md">
              -{prod.discountPercent}% הנחה
            </span>
          ) : null}
        </div>

        {/* Title & Price */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
              <Star className="w-4 h-4 fill-amber-400" />
              <span>{prod.rating || 4.8} / 5</span>
            </div>
            {prod.ordersCount ? (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500">{prod.ordersCount}+ רכשו בהצלחה</span>
              </>
            ) : null}
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-950 leading-snug">
            {displayTitle}
          </h1>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-4xl font-black text-slate-950">₪{prod.priceIls}</span>
            <span className="text-lg text-slate-500 font-semibold">(${prod.priceUsd})</span>
            {prod.originalPriceUsd && (
              <span className="text-sm text-slate-400 line-through mr-2">
                (${prod.originalPriceUsd})
              </span>
            )}
          </div>
        </div>

        {/* Israeli Customs badge */}
        <div
          className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2.5 ${
            isTaxExempt
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-900"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            {isTaxExempt
              ? "✓ פטור מלא ממכס ומע\"מ בישראל (המחיר נמוך מרף ה-$75)"
              : "המחיר מעל $75 - ייתכן חיוב במע\"מ (17%) בשחרור החבילה"}
          </span>
        </div>

        {/* Israeli Trust Bullets */}
        <ul className="space-y-2 text-xs text-slate-700 bg-slate-50 p-4 rounded-xl border border-slate-100">
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>תאימות שקע אירופאי (EU Plug) מתאים לשקעים בישראל</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>משלוח מבוטח עם מספר מעקב (AliExpress Standard Shipping)</span>
          </li>
          <li className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>הגנת רוכש מלאה במקרה של אובדן או אי-התאמה</span>
          </li>
        </ul>

        {/* Mega Purchase Button */}
        <PurchaseCtaButton
          productId={prod.aliId || prod.id}
          productTitle={displayTitle}
          priceUsd={prod.priceUsd}
          priceIls={prod.priceIls}
          pageSlug={`lp_${slug}`}
          source="campaign_landing_page"
          className="w-full flex items-center justify-center gap-3 py-4 rounded-2xl bg-gradient-to-r from-ali-600 to-ali-500 hover:from-ali-700 hover:to-ali-600 text-white font-black text-lg shadow-xl shadow-ali-500/30 hover:scale-[1.01] transition-all"
        />

        <p className="text-[11px] text-slate-400 text-center">
          הרכישה מתבצעת ישירות מול המוכר המורשה באלי אקספרס עם הגנת רוכש רשמית
        </p>
      </main>

      {/* Minimal Footer */}
      <footer className="text-center text-xs text-slate-400 pt-4">
        © 2026 AliDeals ישראל | פורטל הדילים וההשוואות המוביל
      </footer>
    </div>
  );
}
