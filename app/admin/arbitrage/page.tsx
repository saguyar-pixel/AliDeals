"use client";

import { useState } from "react";
import { TrendingUp, Calculator, DollarSign, Target, Copy, Check } from "lucide-react";

export default function AdminArbitragePage() {
  // Arbitrage Calculator state
  const [adSpend, setAdSpend] = useState<number>(500); // 500 ILS
  const [cpc, setCpc] = useState<number>(0.5); // 0.50 ILS per click
  const [affiliateRevenue, setAffiliateRevenue] = useState<number>(850); // 850 ILS commissions

  const calculatedClicks = cpc > 0 ? Math.round(adSpend / cpc) : 0;
  const netProfit = affiliateRevenue - adSpend;
  const rpc = calculatedClicks > 0 ? (affiliateRevenue / calculatedClicks).toFixed(2) : "0.00";
  const roas = adSpend > 0 ? ((affiliateRevenue / adSpend) * 100).toFixed(1) : "0";

  // URL Generator state
  const [targetSlug, setTargetSlug] = useState("magcubic-hy300-projector-review");
  const [campaignSource, setCampaignSource] = useState("facebook_ads");
  const [campaignName, setCampaignName] = useState("hy300_scale_ad1");
  const [copied, setCopied] = useState(false);

  const generatedCampaignUrl = `https://alideals.co.il/reviews/${targetSlug}/?utm_source=${campaignSource}&utm_campaign=${campaignName}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(generatedCampaignUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-20">
      <div>
        <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">שיווק ממומן ומדידה</span>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
          דשבורד ארביטראז&apos; איקומרס ו-SubIDs
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          חישוב רווחיות קמפיינים ממומנים (Meta, Google, TikTok) מול ה-RPC (Revenue Per Click) באלי אקספרס.
        </p>
      </div>

      {/* Arbitrage Calculator Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Calculator className="w-5 h-5 text-emerald-600" />
          <h2 className="font-bold text-base text-slate-900">מחשבון יחידת כלכלה לארביטראז&apos; (Unit Economics)</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">תקציב פרסום ממומן (בש&quot;ח):</label>
            <div className="relative">
              <span className="absolute right-3 top-2.5 text-slate-400 text-sm">₪</span>
              <input
                type="number"
                value={adSpend}
                onChange={(e) => setAdSpend(Number(e.target.value))}
                className="w-full pr-8 pl-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">עלות ממוצעת לקליק (CPC בש&quot;ח):</label>
            <div className="relative">
              <span className="absolute right-3 top-2.5 text-slate-400 text-sm">₪</span>
              <input
                type="number"
                step="0.05"
                value={cpc}
                onChange={(e) => setCpc(Number(e.target.value))}
                className="w-full pr-8 pl-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">סך עמלות שהתקבלו מאלי אקספרס (בש&quot;ח):</label>
            <div className="relative">
              <span className="absolute right-3 top-2.5 text-slate-400 text-sm">₪</span>
              <input
                type="number"
                value={affiliateRevenue}
                onChange={(e) => setAffiliateRevenue(Number(e.target.value))}
                className="w-full pr-8 pl-4 py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Calculated Results Bar */}
        <div className="rounded-2xl bg-slate-900 text-white p-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div className="space-y-1">
            <span className="text-xs text-slate-400">קליקים שנוצרו</span>
            <div className="text-2xl font-black text-white">{calculatedClicks.toLocaleString()}</div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">הכנסה לקליק (RPC)</span>
            <div className="text-2xl font-black text-amber-400">₪{rpc}</div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">רווח נקי (Net Profit)</span>
            <div className={`text-2xl font-black ${netProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              ₪{netProfit}
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400">החזר הוצאה (ROAS)</span>
            <div className="text-2xl font-black text-indigo-400">{roas}%</div>
          </div>
        </div>
      </section>

      {/* SubID URL Generator Card */}
      <section className="rounded-3xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <Target className="w-5 h-5 text-ali-600" />
          <h2 className="font-bold text-base text-slate-900">מחולל קישורי קמפיין עם הזרקת SubID</h2>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          הזן את נתוני הקמפיין כדי לקבל קישור ייעודי. כאשר הגולש ילחץ על כפתור הקנייה באתר הסטטי שלך ב-GitHub Pages,
          הסקריפט יחלץ את ה-UTMs ויזריק אותם אוטומטית כ-SubID 1 ו-SubID 2 לקישור של אלי אקספרס!
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">עמוד יעד (Slug):</label>
            <input
              type="text"
              value={targetSlug}
              onChange={(e) => setTargetSlug(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">מקור תנועה (utm_source):</label>
            <select
              value={campaignSource}
              onChange={(e) => setCampaignSource(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
            >
              <option value="facebook_ads">Meta / Facebook Ads</option>
              <option value="google_cpc">Google Search CPC</option>
              <option value="tiktok_ads">TikTok Ads</option>
              <option value="outbrain">Outbrain / Taboola Native</option>
              <option value="newsletter">Email Newsletter</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700">שם קמפיין / מודעה (utm_campaign):</label>
            <input
              type="text"
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono"
            />
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-xs font-mono text-slate-800 break-all">{generatedCampaignUrl}</span>
          <button
            type="button"
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs shrink-0 transition-all"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>הקישור הועתק!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>העתק קישור לקמפיין</span>
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  );
}
