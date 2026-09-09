import Image from "next/image";
import { Star, ExternalLink, Award } from "lucide-react";
import { AliExpressProduct } from "@/lib/aliexpress/types";

interface ComparisonTableProps {
  products: AliExpressProduct[];
  rankings: Array<{
    rank: number;
    badge: string;
    titleHe: string;
    keyHighlight: string;
    verdict: string;
  }>;
  pageId?: string;
}

export default function ComparisonTable({ products, rankings, pageId }: ComparisonTableProps) {
  return (
    <div className="my-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
              <th className="py-4 px-4 text-center w-16">דירוג</th>
              <th className="py-4 px-4 w-24">תמונה</th>
              <th className="py-4 px-6">מוצר ותואר</th>
              <th className="py-4 px-4">יתרון בולט</th>
              <th className="py-4 px-4">ציון</th>
              <th className="py-4 px-4">מחיר</th>
              <th className="py-4 px-6 text-center">לינק רכישה</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {rankings.map((item, idx) => {
              const prod = products[idx] || products[0];
              const outboundUrl = prod.affiliateUrl || prod.aliUrl || `https://www.aliexpress.com/item/${prod.aliId}.html`;

              return (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 text-center font-black text-lg text-slate-700">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center mx-auto border border-slate-200">
                      #{item.rank}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-white">
                      <Image
                        src={prod.mainImage}
                        alt={item.titleHe}
                        fill
                        className="object-cover"
                        sizes="64px"
                      />
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-ali-600 bg-ali-50 px-2 py-0.5 rounded-full border border-ali-100">
                        <Award className="w-3 h-3" />
                        {item.badge}
                      </span>
                    </div>
                    <h4 className="font-bold text-slate-900 text-sm">{item.titleHe}</h4>
                  </td>
                  <td className="py-4 px-4 text-xs font-medium text-slate-600 max-w-xs">{item.keyHighlight}</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span>{prod.rating}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex flex-col">
                      <span className="font-black text-slate-900 text-base">₪{prod.priceIls}</span>
                      <span className="text-xs text-slate-400">(${prod.priceUsd})</span>
                    </div>
                  </td>
                  <td className="py-4 px-6 text-center">
                    <a
                      href={outboundUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shadow-sm transition-all"
                    >
                      <span>לדיל</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards */}
      <div className="md:hidden divide-y divide-slate-100">
        {rankings.map((item, idx) => {
          const prod = products[idx] || products[0];
          const outboundUrl = prod.affiliateUrl || prod.aliUrl || `https://www.aliexpress.com/item/${prod.aliId}.html`;

          return (
            <div key={idx} className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-slate-200 shrink-0 bg-white">
                  <Image
                    src={prod.mainImage}
                    alt={item.titleHe}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                  <div className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-black flex items-center justify-center">
                    #{item.rank}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <span className="inline-block text-[11px] font-bold text-ali-600 bg-ali-50 px-2 py-0.5 rounded-full border border-ali-100 mb-1">
                    {item.badge}
                  </span>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{item.titleHe}</h4>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="font-black text-slate-900 text-base">₪{prod.priceIls}</span>
                    <span className="text-xs text-slate-400">(${prod.priceUsd})</span>
                    <div className="flex items-center gap-1 text-amber-500 font-bold text-xs mr-auto">
                      <Star className="w-3.5 h-3.5 fill-amber-400" />
                      <span>{prod.rating}</span>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                {item.keyHighlight}
              </p>

              <a
                href={outboundUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ali-600 text-white font-bold text-xs shadow-md"
              >
                <span>לרכישה באלי אקספרס</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
}
