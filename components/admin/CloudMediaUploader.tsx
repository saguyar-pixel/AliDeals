"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  UploadCloud,
  Loader2,
  Trash2,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  AlertCircle,
  FileImage,
} from "lucide-react";
import { getAdminHeaders } from "@/lib/admin/admin-fetch";

interface CloudMediaUploaderProps {
  imageUrl: string;
  altText: string;
  onChange: (url: string, alt: string) => void;
  productTitle?: string;
  category?: string;
  label?: string;
  description?: string;
}

export default function CloudMediaUploader({
  imageUrl,
  altText,
  onChange,
  productTitle = "",
  category = "אלקטרוניקה וגאדג'טים",
  label = "תמונה מרכזית נוספת / אינפוגרפיה מותאמת אישית (Supabase Cloud Storage)",
  description = "העלה קובץ תמונה (WebP, PNG, JPG). הקובץ יישמר ב-100% ישירות בענן ב-Bucket הייעודי review-assets ללא שמירה מקומית כלל.",
}: CloudMediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingAlt, setIsGeneratingAlt] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleUploadFile = async (file: File) => {
    if (!file) return;

    setErrorMsg(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("altText", altText || productTitle);
      formData.append("folder", "reviews");

      const adminHeaders = getAdminHeaders();
      // Remove Content-Type to let browser set boundary for FormData
      delete (adminHeaders as any)["Content-Type"];

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: adminHeaders,
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "שגיאה בהעלאת התמונה לענן");
      }

      const uploadedUrl = data.url;
      const initialAlt = altText || `${productTitle || "מוצר אלי אקספרס"} - סקירה מומלצת`;
      onChange(uploadedUrl, initialAlt);

      // Auto-generate Alt Text via Ron if product title is available and alt is empty
      if (productTitle && !altText) {
        handleGenerateAltText(uploadedUrl);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || "נכשלה העלאת הקובץ ל-Supabase Storage");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleUploadFile(file);
    }
  };

  const handleGenerateAltText = async (targetUrl: string = imageUrl) => {
    if (!productTitle) {
      setErrorMsg("נדרשת כותרת מוצר כדי שניסוח ה-Alt יתבצע במדויק ע״י רון");
      return;
    }

    setIsGeneratingAlt(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/generate/alt-text", {
        method: "POST",
        headers: getAdminHeaders(),
        body: JSON.stringify({ productTitle, category }),
      });
      const data = await res.json();
      if (data.altText) {
        onChange(targetUrl, data.altText);
      }
    } catch {
      setErrorMsg("שגיאה בניסוח ה-Alt הטקסט");
    } finally {
      setIsGeneratingAlt(false);
    }
  };

  const handleCopyUrl = () => {
    if (!imageUrl) return;
    navigator.clipboard.writeText(imageUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRemove = () => {
    onChange("", "");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4 shadow-xs">
      <div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <FileImage className="w-4 h-4 text-ali-600" />
            <span>{label}</span>
          </label>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            Supabase CDN
          </span>
        </div>
        <p className="text-[11px] text-slate-500 mt-1">{description}</p>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {imageUrl ? (
        <div className="space-y-4">
          {/* Uploaded Image Preview Box */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-950/5 flex flex-col sm:flex-row items-center gap-4 p-4">
            <div className="relative w-44 h-32 rounded-xl overflow-hidden bg-white border border-slate-200 shrink-0 shadow-xs">
              <Image
                src={imageUrl}
                alt={altText || "Uploaded asset"}
                fill
                className="object-contain p-1.5"
                sizes="176px"
              />
            </div>

            <div className="flex-1 min-w-0 space-y-2 w-full">
              <div className="flex items-center gap-2 text-xs text-emerald-700 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>הקובץ מאוחסן ב-Supabase Storage (זמין פומבית ב-CDN)</span>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={imageUrl}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-[11px] font-mono text-slate-600 truncate"
                />
                <button
                  type="button"
                  onClick={handleCopyUrl}
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all cursor-pointer"
                  title="העתק URL פומבי"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all"
                  title="פתח בכרטיסייה חדשה"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  החלף תמונה
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={handleRemove}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold underline flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>הסר תמונה</span>
                </button>
              </div>
            </div>
          </div>

          {/* Alt Text Input & Agent Ron Formulator */}
          <div className="space-y-1.5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                Alt Text שיווקי ונגיש (SEO Image Tag):
              </label>
              <button
                type="button"
                onClick={() => handleGenerateAltText()}
                disabled={isGeneratingAlt || !productTitle}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
              >
                {isGeneratingAlt ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                <span>נסח Alt ע״י הסוכן רון</span>
              </button>
            </div>
            <input
              type="text"
              value={altText}
              onChange={(e) => onChange(imageUrl, e.target.value)}
              placeholder="למשל: סקירת מפרט מעמיקה של המוצר עם שקע אירופאי ומשלוח מהיר לישראל..."
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-ali-500"
            />
            <p className="text-[10px] text-slate-400">
              ה-Alt Text מוטמע כתווית הנגישות ב-HTML ומוצג ככיתוב (Caption) תחת התמונה בסקירה.
            </p>
          </div>
        </div>
      ) : (
        /* Empty Upload Zone */
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-center transition-all cursor-pointer ${
            isDragging
              ? "border-ali-500 bg-ali-50/50"
              : "border-slate-200 hover:border-ali-400 bg-slate-50/50 hover:bg-slate-50"
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Loader2 className="w-8 h-8 text-ali-600 animate-spin" />
              <span className="text-xs font-bold text-slate-700">מעלה תמונה ישירות ל-Supabase Storage...</span>
              <span className="text-[10px] text-slate-400">הקובץ מנותב ישירות לענן ללא שמירה מקומית</span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-center justify-center text-ali-600">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-800">
                  גרור לכאן תמונה או <span className="text-ali-600 underline">לחץ לבחירה מהמכשיר</span>
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">פורמטים נתמכים: WebP, PNG, JPG (עד 8MB)</p>
              </div>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
