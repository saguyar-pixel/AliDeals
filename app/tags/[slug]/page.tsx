import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { jsonDb } from "@/lib/db";
import { ChevronLeft, ArrowLeft, Tag, ShoppingCart } from "lucide-react";

export const dynamic = "force-dynamic";
export const dynamicParams = true;
export const revalidate = 0;

interface TagPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: TagPageProps): Promise<Metadata> {
  const { slug } = await params;
  const decodedTag = decodeURIComponent(slug).replace(/^#/, "");

  return {
    title: `דילים וסקירות עם התגית #${decodedTag} | AliDeals ישראל`,
    description: `ריכוז כל המוצרים, הסקירות והמדריכים המתוייגים תחת #${decodedTag} באלי אקספרס בישראל.`,
  };
}

export default async function TagPage({ params }: TagPageProps) {
  const { slug } = await params;
  const decodedTag = decodeURIComponent(slug).replace(/^#/, "");

  const allProducts = jsonDb.getAllProducts().filter((p) => p.status !== "inactive");
  const matchingProducts = allProducts.filter((p) =>
    p.tags?.some((t) => t.toLowerCase().includes(decodedTag.toLowerCase()) || decodedTag.toLowerCase().includes(t.toLowerCase()))
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10 pb-24" dir="rtl">
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-500">
        <Link href="/" className="hover:text-slate-900 transition-colors">
          ראשי
        </Link>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-slate-900 font-semibold truncate">תגית #{decodedTag}</span>
      </nav>

      <header className="rounded-3xl bg-slate-900 text-white p-8 shadow-xl border border-slate-800 space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-bold text-ali-400">
          <Tag className="w-3.5 h-3.5" />
          <span>תגית תוכן</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black">#{decodedTag}</h1>
        <p className="text-xs sm:text-sm text-slate-400">
          נמצאו {matchingProducts.length} מוצרים התואמים לתגית זו
        </p>
      </header>

      {matchingProducts.length === 0 ? (
        <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
          לא נמצאו מוצרים התואמים לתגית #{decodedTag}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {matchingProducts.map((prod) => {
            const isTaxExempt = prod.priceUsd < 75;
            const goUrl = `/go/${prod.aliId || prod.id}?source=tag_${encodeURIComponent(decodedTag)}`;

            return (
              <div
                key={prod.id}
                className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4"
              >
                <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-50 border border-slate-100">
                  <Image
                    src={prod.mainImage}
                    alt={prod.titleHe || prod.originalTitle}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {prod.discountPercent ? (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-ali-600 text-white text-xs font-black shadow-sm">
                      -{prod.discountPercent}%
                    </span>
                  ) : null}
                </div>

                <div className="space-y-2 flex-1">
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded-md border ${
                      isTaxExempt
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                        : "text-amber-700 bg-amber-50 border-amber-200"
                    }`}
                  >
                    {isTaxExempt ? `פטור ממכס ($${prod.priceUsd})` : `חייב מע"מ ($${prod.priceUsd})`}
                  </span>

                  <h3 className="font-bold text-sm text-slate-900 line-clamp-2 leading-snug">
                    {prod.titleHe || prod.originalTitle}
                  </h3>

                  <div className="flex items-baseline gap-1.5 pt-1">
                    <span className="text-xl font-black text-slate-950">₪{prod.priceIls}</span>
                    <span className="text-xs text-slate-400 font-semibold">(${prod.priceUsd})</span>
                  </div>
                </div>

                <a
                  href={goUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span>לדיל באלי אקספרס</span>
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
