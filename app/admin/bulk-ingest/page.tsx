"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Link2,
  Sparkles,
  ArrowRight,
  Package,
  Check,
  Trash2,
  Copy,
  Layers,
  ShoppingBag,
  ExternalLink,
  HelpCircle,
} from "lucide-react";
import { CustomsBadge } from "@/components/admin/CustomsBadge";

interface ParsedItem {
  id: string;
  url: string;
  imageUrl?: string;
  title: string;
  priceUsd: number;
  category: string;
}

export default function BulkIngestPage() {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  // Smart parser for both raw URLs and HTML tags like <a href="..."><img src="..." /></a>
  const handleParse = () => {
    if (!rawInput.trim()) return;

    const lines = rawInput.split("\n");
    const items: ParsedItem[] = [];

    // Check for HTML blocks or raw links
    const htmlAnchorRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>(.*?)<\/a>/gis;
    let match;
    let foundHtml = false;

    while ((match = htmlAnchorRegex.exec(rawInput)) !== null) {
      foundHtml = true;
      const href = match[1];
      const innerHtml = match[2];

      let imgUrl = "";
      const imgMatch = /<img\s+(?:[^>]*?\s+)?src="([^"]*)"/i.exec(innerHtml);
      if (imgMatch) {
        imgUrl = imgMatch[1];
        if (imgUrl.startsWith("//")) imgUrl = `https:${imgUrl}`;
        // Clean thumbnail suffixes (e.g. _80x80.png -> full size)
        imgUrl = imgUrl.replace(/_\d+x\d+\.(png|jpg|jpeg)$/i, "");
      }

      items.push({
        id: `parsed_${Date.now()}_${items.length}`,
        url: href,
        imageUrl: imgUrl,
        title: `מוצר אלי אקספרס #${items.length + 1}`,
        priceUsd: 35.0,
        category: "אלקטרוניקה וגאדג'טים",
      });
    }

    // If no HTML found, parse by lines of plain URLs
    if (!foundHtml) {
      const urlRegex = /https?:\/\/[^\s]+/g;
      const allUrls = rawInput.match(urlRegex) || [];

      allUrls.forEach((url, i) => {
        // Remove trailing commas/quotes
        const cleanUrl = url.replace(/["',;)]+$/, "");
        items.push({
          id: `parsed_${Date.now()}_${i}`,
          url: cleanUrl,
          imageUrl: "",
          title: `מוצר אלי אקספרס #${i + 1}`,
          priceUsd: 35.0,
          category: "אלקטרוניקה וגאדג'טים",
        });
      });
    }

    setParsedItems(items);
    setSavedCount(null);
  };

  const handleUpdateItem = (id: string, field: keyof ParsedItem, val: any) => {
    setParsedItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    setParsedItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Save all to central product catalog
  const handleSaveToCatalog = async () => {
    if (parsedItems.length === 0) return;
    setIsSaving(true);
    let count = 0;

    try {
      for (const item of parsedItems) {
        const aliIdMatch = item.url.match(/item\/(\d+)\.html/) || item.url.match(/_([a-zA-Z0-9]+)/);
        const aliId = aliIdMatch ? aliIdMatch[1] : `ali_${Date.now()}_${count}`;

        await fetch("/api/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            aliId,
            originalTitle: item.title,
            titleHe: item.title,
            priceUsd: item.priceUsd,
            priceIls: Math.round(item.priceUsd * 3.65 * 10) / 10,
            mainImage: item.imageUrl || "",
            aliUrl: item.url,
            affiliateUrl: item.url,
          }),
        });
        count++;
      }
      setSavedCount(count);
    } catch (e) {
      alert("שגיאה בשמירת המוצרים");
    } finally {
      setIsSaving(false);
    }
  };

  // Generate TOP 5 Page from these items
  const handleCreateTop5 = async () => {
    if (parsedItems.length < 2) {
      alert("נא להזין לפחות 2 מוצרים להשוואת TOP 5");
      return;
    }
    // Save them to catalog first
    await handleSaveToCatalog();
    // Redirect to Ingest / AI generator with items
    const encodedUrls = encodeURIComponent(parsedItems.map((p) => p.url).join(","));
    router.push(`/admin/ingest?batchUrls=${encodedUrls}&type=top5`);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-24" dir="rtl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-ali-600 uppercase tracking-wider">
              סטודיו להזנה מרובה ונוחה
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
            הזנת קישורי אפיליאציה ובאנרים
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            הדבק קישורים מקוצרים (s.click), לינקים רגילים או קודי HTML מלאים של תמונות – המערכת תפענח אותם אוטומטית!
          </p>
        </div>

        <Link
          href="/admin/products"
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold"
        >
          <Package className="w-4 h-4" />
          <span>למאגר המוצרים</span>
        </Link>
      </div>

      {/* Input Box */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <label className="block font-bold text-xs text-slate-800">
            הדבק כאן קישורים או קודי HTML של תמונות (אפשר כמה בשורות נפרדות):
          </label>
          <span className="text-[11px] text-slate-400">
            תומך ב-s.click, קישורי מוצר ותגיות &lt;a href=&quot;...&quot;&gt;&lt;img src=&quot;...&quot;&gt;&lt;/a&gt;
          </span>
        </div>

        <textarea
          rows={6}
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={`לדוגמה:
https://s.click.aliexpress.com/e/_c3mWr0KH
https://s.click.aliexpress.com/e/_c3SfZh85
או קוד תמונה:
<a href="https://s.click.aliexpress.com/e/_c3cHfEE5" target="_blank"><img src="//ae01.alicdn.com/kf/S3ecfbc93340a4bfe84185da1d2d3a2a5u.png_80x80.png" /></a>`}
          className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-mono text-slate-900 focus:outline-none focus:border-ali-500 leading-relaxed"
        />

        <div className="flex items-center justify-between pt-1">
          <button
            type="button"
            onClick={handleParse}
            disabled={!rawInput.trim()}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow transition-all disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>פענח קישורים ותמונות</span>
          </button>

          {parsedItems.length > 0 && (
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
              {parsedItems.length} מוצרים פוענחו בהצלחה!
            </span>
          )}
        </div>
      </div>

      {savedCount !== null && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
          <span>✓ נשמרו {savedCount} מוצרים ישירות למאגר המוצרים המרכזי!</span>
          <Link href="/admin/products" className="underline hover:text-emerald-950">
            צפה במאגר המוצרים ➔
          </Link>
        </div>
      )}

      {/* Parsed Items List */}
      {parsedItems.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <Package className="w-4 h-4 text-indigo-600" />
              <span>ערוך פרטים לפני שמירה או הפקת כתבה:</span>
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleSaveToCatalog}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs transition-all shadow-sm disabled:opacity-50"
              >
                {isSaving ? "שומר למאגר..." : "שמור הכל למאגר המוצרים"}
              </button>

              <button
                type="button"
                onClick={handleCreateTop5}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-ali-600 to-indigo-600 hover:brightness-110 text-white font-bold text-xs shadow-md transition-all"
              >
                <Layers className="w-4 h-4" />
                <span>צור השוואת TOP 5 מכל המוצרים!</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parsedItems.map((item, idx) => (
              <div
                key={item.id}
                className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top Header */}
                  <div className="flex items-center justify-between">
                    <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>

                    <div className="flex items-center gap-2">
                      <CustomsBadge priceUsd={item.priceUsd} />
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="הסר"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Thumbnail + Title Input */}
                  <div className="flex gap-3 items-start">
                    <div className="w-20 h-20 bg-slate-100 rounded-2xl overflow-hidden shrink-0 border border-slate-200 flex items-center justify-center p-1 relative">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt=""
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <ShoppingBag className="w-8 h-8 text-slate-300" />
                      )}
                    </div>

                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                          שם המוצר בעברית
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => handleUpdateItem(item.id, "title", e.target.value)}
                          className="w-full p-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            מחיר ($ USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={item.priceUsd}
                            onChange={(e) =>
                              handleUpdateItem(item.id, "priceUsd", parseFloat(e.target.value) || 0)
                            }
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 mb-0.5">
                            קטגוריה
                          </label>
                          <select
                            value={item.category}
                            onChange={(e) => handleUpdateItem(item.id, "category", e.target.value)}
                            className="w-full p-1.5 rounded-lg border border-slate-200 text-xs text-slate-700 focus:outline-none"
                          >
                            <option value="אלקטרוניקה וגאדג'טים">אלקטרוניקה וגאדג&apos;טים</option>
                            <option value="בית ומטבח">בית ומטבח</option>
                            <option value="תינוקות וילדים">תינוקות וילדים</option>
                            <option value="ביגוד וספורט">ביגוד וספורט</option>
                            <option value="רכב ואביזרים">רכב ואביזרים</option>
                            <option value="כלים ותחזוקה">כלים ותחזוקה</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* URL and Image Inputs */}
                  <div className="space-y-1.5 pt-1 text-[11px]">
                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">
                        קישור אפיליאציה:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={item.url}
                          onChange={(e) => handleUpdateItem(item.id, "url", e.target.value)}
                          className="w-full p-1.5 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700"
                        />
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-ali-600 shrink-0"
                          title="בדוק לינק"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-500 font-bold block mb-0.5">
                        קישור תמונת HD:
                      </span>
                      <input
                        type="text"
                        value={item.imageUrl || ""}
                        onChange={(e) => handleUpdateItem(item.id, "imageUrl", e.target.value)}
                        placeholder="https://ae01.alicdn.com/..."
                        className="w-full p-1.5 rounded-lg border border-slate-200 font-mono text-[10px] text-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Footer Generate Link */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 font-bold">
                    כ-₪{Math.round(item.priceUsd * 3.65)}
                  </span>
                  <Link
                    href={`/admin/ingest?directUrl=${encodeURIComponent(item.url)}&type=review`}
                    className="flex items-center gap-1 text-xs font-bold text-ali-600 hover:text-ali-700"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>הפק סקירה יחידה למוצר זה ➔</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
