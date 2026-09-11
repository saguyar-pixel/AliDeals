"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronRight, ChevronLeft, Expand, Images } from "lucide-react";

interface ProductImageGalleryProps {
  images: string[];
  title: string;
}

export default function ProductImageGallery({ images, title }: ProductImageGalleryProps) {
  const cleanImages = Array.from(
    new Set(
      images
        .map((img) => (img?.startsWith("//") ? `https:${img}` : img))
        .filter((img) => Boolean(img && img.startsWith("http")))
    )
  );

  const [activeIndex, setActiveIndex] = useState(0);

  if (cleanImages.length === 0) {
    return null;
  }

  const currentImage = cleanImages[activeIndex] || cleanImages[0];

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? cleanImages.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === cleanImages.length - 1 ? 0 : prev + 1));
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-4 my-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images className="w-4 h-4 text-ali-600" />
          <h3 className="font-bold text-base text-slate-900">גלריית תמונות מהמפעל (AliExpress CDN)</h3>
        </div>
        <span className="text-xs text-slate-400">
          תמונה {activeIndex + 1} מתוך {cleanImages.length}
        </span>
      </div>

      {/* Main Preview */}
      <div className="relative aspect-video sm:aspect-2/1 w-full rounded-2xl overflow-hidden bg-slate-100 border border-slate-100 group">
        <Image
          src={currentImage}
          alt={`${title} - תמונה ${activeIndex + 1}`}
          fill
          className="object-contain p-2 transition-all duration-300"
          sizes="(max-width: 1024px) 100vw, 800px"
          priority={activeIndex === 0}
        />

        {/* Navigation Arrows */}
        {cleanImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={handlePrev}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              aria-label="תמונה קודמת"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 hover:bg-white text-slate-700 shadow-md flex items-center justify-center transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
              aria-label="תמונה הבאה"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          </>
        )}
      </div>

      {/* Thumbnails Row */}
      {cleanImages.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
          {cleanImages.map((img, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={`${img}_${idx}`}
                type="button"
                onClick={() => setActiveIndex(idx)}
                className={`relative w-16 h-16 sm:w-20 sm:h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                  isSelected
                    ? "border-ali-600 scale-105 shadow-sm"
                    : "border-slate-200 opacity-60 hover:opacity-100 hover:border-slate-300"
                }`}
              >
                <Image
                  src={img}
                  alt={`תמונה ממוזערת ${idx + 1}`}
                  fill
                  className="object-cover"
                  sizes="80px"
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
