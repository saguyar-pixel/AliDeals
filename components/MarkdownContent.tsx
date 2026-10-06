"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, AlertTriangle, Lightbulb, ExternalLink, Play, ShoppingCart, Check } from "lucide-react";

interface MarkdownContentProps {
  content: string;
  className?: string;
  products?: any[];
}

/**
 * Clean & decode raw content (unescapes HTML entities, fixes currency $$ and charset)
 */
function sanitizeRawContent(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    // Fix literal double-dollar signs ($$25 or $$) often emitted by AI as pseudo-LaTeX
    .replace(/\$\$\s*/g, "$")
    // Fix escaped markdown slashes
    .replace(/\\([#*_`[\]()])/g, "$1")
    .trim();
}

/**
 * Extract YouTube ID from various YouTube URL formats (watch, share, shorts)
 */
function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  return match ? match[1] : null;
}

/**
 * Lite YouTube Embed Component: Loads thumbnail first, iframe only on click
 * Drastically improves Mobile Core Web Vitals (LCP < 1.5s, saves ~1.5MB JS)
 */
function LiteYouTubeEmbed({ videoId, title }: { videoId: string; title?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  if (isPlaying) {
    return (
      <div className="my-6 rounded-2xl overflow-hidden shadow-md aspect-video border border-slate-200 bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="w-full h-full border-0"
        />
      </div>
    );
  }

  return (
    <div
      onClick={() => setIsPlaying(true)}
      className="my-6 relative rounded-2xl overflow-hidden shadow-sm aspect-video border border-slate-200 bg-slate-900 group cursor-pointer"
      title="לחץ להפעלת סרטון"
    >
      <img
        src={thumbnailUrl}
        alt={title || "סרטון הדרכה"}
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors flex items-center justify-center">
        <div className="w-16 h-12 rounded-2xl bg-red-600 group-hover:bg-red-700 flex items-center justify-center text-white shadow-xl shadow-red-600/40 transition-all transform group-hover:scale-110">
          <Play className="w-6 h-6 fill-white ml-0.5" />
        </div>
      </div>
      <div className="absolute bottom-3 right-3 left-3 bg-black/70 backdrop-blur-xs text-white text-xs px-3 py-1.5 rounded-lg truncate text-right">
        ▶ {title || "צפה בסרטון הסבר"}
      </div>
    </div>
  );
}

/**
 * Embedded Product Showcase Card: Inline, non-intrusive, mobile-friendly
 */
function EmbeddedProductCard({ product, rawId }: { product?: any; rawId: string }) {
  if (!product) {
    return (
      <div className="my-4 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
        <span>מוצר מומלץ (קוד: {rawId})</span>
        <Link href="/reviews" className="font-bold text-indigo-600 hover:underline">
          לכל הסקירות באתר ←
        </Link>
      </div>
    );
  }

  const priceIls = product.priceIls || Math.round((product.priceUsd || 0) * 3.65);
  const priceUsd = Number(product.priceUsd) || 0;
  const title = product.titleHe || product.title || product.originalTitle || "מוצר מומלץ";
  const image = product.mainImage || product.featuredImage || "/placeholder-product.png";
  const rating = Number(product.rating) || 4.8;
  const ordersCount = Number(product.ordersCount) || 0;
  const discountPercent = Number(product.discountPercent || product.discount_rate || 0);
  const reviewSlug = product.slug || product.id;
  const reviewUrl = `/reviews/${reviewSlug}`;
  const buyUrl = product.aliId
    ? `/go/${product.aliId}?sub_id=article_embed`
    : product.affiliateUrl || product.aliUrl || "#";

  return (
    <div
      className="my-5 p-4 rounded-2xl bg-gradient-to-r from-slate-50 via-white to-amber-50/20 border border-slate-200/90 shadow-xs hover:shadow-md transition-all text-right"
      dir="rtl"
    >
      <div className="flex flex-col sm:flex-row items-center gap-4">
        {/* Product Image */}
        <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-white border border-slate-100 shrink-0 p-1 flex items-center justify-center shadow-xs">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-contain rounded-lg"
            loading="lazy"
          />
          {discountPercent > 0 && (
            <span className="absolute top-1 right-1 bg-rose-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Product Info */}
        <div className="flex-1 min-w-0 text-center sm:text-right">
          <div className="flex items-center justify-center sm:justify-start gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200/60">
              מוצר מומלץ בכתבה
            </span>
            {rating > 0 && (
              <span className="text-amber-600 text-xs font-bold flex items-center gap-1">
                ⭐ {rating} {ordersCount > 0 ? `(${ordersCount.toLocaleString()} הזמנות)` : ""}
              </span>
            )}
          </div>
          <h4 className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug">
            {title}
          </h4>
          <div className="flex items-baseline justify-center sm:justify-start gap-2 mt-1">
            <span className="text-lg sm:text-xl font-black text-slate-950">
              ₪{priceIls.toLocaleString()}
            </span>
            {priceUsd > 0 && (
              <span className="text-xs text-slate-500 font-medium">
                (${priceUsd.toFixed(2)})
              </span>
            )}
          </div>
        </div>

        {/* Dual Action CTAs */}
        <div className="flex flex-row sm:flex-col gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0">
          <a
            href={buyUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-ali-600 hover:bg-ali-700 text-white font-bold text-xs text-center shadow-sm shadow-ali-600/20 transition-all flex items-center justify-center gap-1.5"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>קנה בעליאקספרס</span>
          </a>
          <Link
            href={reviewUrl}
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-indigo-600 font-bold text-xs text-center transition-all flex items-center justify-center gap-1"
          >
            <span>לסקירה המלאה</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Format inline text styles (Bold, Italic, Code, Internal Links, External/Affiliate Links)
 */
function renderInline(text: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining.length > 0) {
    // 1. Bold: **text** or __text__
    const boldMatch = remaining.match(/^(\*\*|__)(.*?)\1/);
    if (boldMatch) {
      tokens.push(
        <strong key={`b_${keyIdx++}`} className="font-bold text-slate-950">
          {boldMatch[2]}
        </strong>
      );
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // 2. Link: [label](url)
    const linkMatch = remaining.match(/^\[(.*?)\]\((.*?)\)/);
    if (linkMatch) {
      const label = linkMatch[1];
      const url = linkMatch[2];
      const isInternal = url.startsWith("/") && !url.startsWith("/go/");

      if (isInternal) {
        tokens.push(
          <Link
            key={`a_${keyIdx++}`}
            href={url}
            className="text-indigo-600 hover:text-indigo-800 underline font-semibold transition-colors"
          >
            {label}
          </Link>
        );
      } else {
        tokens.push(
          <a
            key={`a_${keyIdx++}`}
            href={url}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="text-ali-600 hover:text-ali-700 underline font-semibold inline-flex items-center gap-0.5 transition-colors"
          >
            <span>{label}</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-70 inline" />
          </a>
        );
      }
      remaining = remaining.slice(linkMatch[0].length);
      continue;
    }

    // 3. Inline Code: `code`
    const codeMatch = remaining.match(/^`([^`]+)`/);
    if (codeMatch) {
      tokens.push(
        <code
          key={`c_${keyIdx++}`}
          className="px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-800 text-[11px] font-mono border border-slate-200"
        >
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // 4. Italic: *text*
    const italicMatch = remaining.match(/^\*([^*]+)\*/);
    if (italicMatch) {
      tokens.push(
        <em key={`i_${keyIdx++}`} className="italic text-slate-800">
          {italicMatch[1]}
        </em>
      );
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Find next special delimiter
    const nextSpecial = remaining.search(/(\*\*|__|\[|`|\*)/);
    if (nextSpecial === -1) {
      tokens.push(remaining);
      break;
    } else if (nextSpecial > 0) {
      tokens.push(remaining.slice(0, nextSpecial));
      remaining = remaining.slice(nextSpecial);
    } else {
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export default function MarkdownContent({
  content,
  className = "",
  products = [],
}: MarkdownContentProps) {
  if (!content) return null;

  const cleaned = sanitizeRawContent(content);
  const lines = cleaned.split(/\r?\n/);
  const nodes: React.ReactNode[] = [];

  let inUnorderedList = false;
  let inOrderedList = false;
  let listItems: React.ReactNode[] = [];
  let blockIdx = 0;

  const flushList = () => {
    if (inUnorderedList) {
      nodes.push(
        <ul
          key={`ul_${blockIdx++}`}
          className="list-disc pr-6 space-y-2 my-4 text-slate-700 leading-relaxed text-sm sm:text-base"
        >
          {listItems}
        </ul>
      );
      inUnorderedList = false;
      listItems = [];
    } else if (inOrderedList) {
      nodes.push(
        <ol
          key={`ol_${blockIdx++}`}
          className="list-decimal pr-6 space-y-2 my-4 text-slate-700 leading-relaxed text-sm sm:text-base"
        >
          {listItems}
        </ol>
      );
      inOrderedList = false;
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line) {
      flushList();
      continue;
    }

    // 1. Embedded Product Card: [product:ID] or [product:ALI_ID]
    const productMatch = line.match(/^\[product:\s*([a-zA-Z0-9_-]+)\]$/i);
    if (productMatch) {
      flushList();
      const rawId = productMatch[1];
      const matchedProduct = products.find(
        (p) =>
          String(p.id) === rawId ||
          String(p.aliId) === rawId ||
          String(p.ali_product_id) === rawId ||
          String(p.slug) === rawId
      );
      nodes.push(
        <EmbeddedProductCard key={`prod_${blockIdx++}_${rawId}`} product={matchedProduct} rawId={rawId} />
      );
      continue;
    }

    // 2. Video Embed: [video](url) or direct video URL
    const videoEmbedMatch = line.match(/^\[video\]\((.*?)\)$/i);
    const ytIdFromLine = extractYouTubeId(line);
    if (videoEmbedMatch || ytIdFromLine) {
      flushList();
      const videoUrl = videoEmbedMatch ? videoEmbedMatch[1].trim() : line;
      const ytId = extractYouTubeId(videoUrl);

      if (ytId) {
        nodes.push(<LiteYouTubeEmbed key={`yt_${blockIdx++}_${ytId}`} videoId={ytId} />);
      } else if (videoUrl.endsWith(".mp4") || videoUrl.endsWith(".webm")) {
        nodes.push(
          <div key={`vid_${blockIdx++}`} className="my-6 rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-black">
            <video
              src={videoUrl}
              controls
              playsInline
              preload="metadata"
              className="w-full max-h-[500px]"
            />
          </div>
        );
      }
      continue;
    }

    // 3. Image with Alt/Caption: ![alt](url)
    const imageMatch = line.match(/^!\[(.*?)\]\((.*?)\)$/);
    if (imageMatch) {
      flushList();
      const altText = imageMatch[1];
      const imgUrl = imageMatch[2];
      nodes.push(
        <figure
          key={`img_${blockIdx++}`}
          className="my-6 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 text-center shadow-xs"
        >
          <img
            src={imgUrl}
            alt={altText || "תמונת מאמר"}
            className="w-full max-h-[520px] object-contain mx-auto"
            loading="lazy"
          />
          {altText && (
            <figcaption className="p-2.5 text-xs text-slate-500 font-medium bg-white border-t border-slate-100">
              {altText}
            </figcaption>
          )}
        </figure>
      );
      continue;
    }

    // 4. Headers
    if (line.startsWith("#### ")) {
      flushList();
      nodes.push(
        <h4 key={`h4_${blockIdx++}`} className="text-base font-bold text-slate-900 mt-5 mb-2">
          {renderInline(line.slice(5))}
        </h4>
      );
      continue;
    }
    if (line.startsWith("### ")) {
      flushList();
      nodes.push(
        <h3
          key={`h3_${blockIdx++}`}
          className="text-lg sm:text-xl font-bold text-slate-900 mt-6 mb-3 flex items-center gap-2"
        >
          <span className="w-1.5 h-4 rounded-full bg-ali-500 inline-block"></span>
          <span>{renderInline(line.slice(4))}</span>
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h2
          key={`h2_${blockIdx++}`}
          className="text-xl sm:text-2xl font-black text-slate-950 mt-8 mb-4 border-b border-slate-100 pb-2"
        >
          {renderInline(line.slice(3))}
        </h2>
      );
      continue;
    }
    if (line.startsWith("# ")) {
      flushList();
      nodes.push(
        <h1 key={`h1_${blockIdx++}`} className="text-2xl sm:text-3xl font-black text-slate-950 mt-8 mb-4">
          {renderInline(line.slice(2))}
        </h1>
      );
      continue;
    }

    // 5. Alert Callouts / Blockquotes
    if (line.startsWith("> ")) {
      flushList();
      const quoteBody = line.slice(2).trim();

      // Check for Tip Callout
      if (
        quoteBody.startsWith("[!TIP]") ||
        quoteBody.startsWith("**טיפ של רון:**") ||
        quoteBody.startsWith("💡")
      ) {
        const cleanTip = quoteBody
          .replace(/^\[!TIP\]\s*/i, "")
          .replace(/^\*\*טיפ של רון:\*\*\s*/i, "")
          .replace(/^💡\s*/, "");
        nodes.push(
          <div
            key={`tip_${blockIdx++}`}
            className="my-5 p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-slate-800 text-sm leading-relaxed shadow-xs flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
              <Lightbulb className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <strong className="block text-emerald-900 font-extrabold text-xs mb-1">
                טיפ זהב מאת רון:
              </strong>
              <span>{renderInline(cleanTip)}</span>
            </div>
          </div>
        );
        continue;
      }

      // Check for Warning Callout
      if (
        quoteBody.startsWith("[!WARNING]") ||
        quoteBody.startsWith("**שים לב:**") ||
        quoteBody.startsWith("**אזהרה:**") ||
        quoteBody.startsWith("⚠️")
      ) {
        const cleanWarning = quoteBody
          .replace(/^\[!WARNING\]\s*/i, "")
          .replace(/^\*\*שים לב:\*\*\s*/i, "")
          .replace(/^\*\*אזהרה:\*\*\s*/i, "")
          .replace(/^⚠️\s*/, "");
        nodes.push(
          <div
            key={`warn_${blockIdx++}`}
            className="my-5 p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-slate-800 text-sm leading-relaxed shadow-xs flex items-start gap-3"
          >
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div className="flex-1">
              <strong className="block text-amber-900 font-extrabold text-xs mb-1">
                שים לב - מידע חשוב:
              </strong>
              <span>{renderInline(cleanWarning)}</span>
            </div>
          </div>
        );
        continue;
      }

      // Standard Blockquote
      nodes.push(
        <blockquote
          key={`bq_${blockIdx++}`}
          className="p-4 my-4 rounded-2xl bg-slate-50 border-r-4 border-ali-500 text-slate-700 text-sm sm:text-base italic leading-relaxed"
        >
          {renderInline(quoteBody)}
        </blockquote>
      );
      continue;
    }

    // 6. Horizontal Rule
    if (line === "---" || line === "***" || line === "___") {
      flushList();
      nodes.push(<hr key={`hr_${blockIdx++}`} className="my-6 border-slate-200" />);
      continue;
    }

    // 7. Unordered List Items: * item, - item, • item
    const ulMatch = line.match(/^[*•-]\s+(.*)$/);
    if (ulMatch) {
      if (!inUnorderedList) {
        flushList();
        inUnorderedList = true;
      }
      listItems.push(
        <li key={`li_${blockIdx++}_${listItems.length}`} className="leading-relaxed">
          {renderInline(ulMatch[1])}
        </li>
      );
      continue;
    }

    // 8. Ordered List Items: 1. item, 2. item
    const olMatch = line.match(/^\d+\.\s+(.*)$/);
    if (olMatch) {
      if (!inOrderedList) {
        flushList();
        inOrderedList = true;
      }
      listItems.push(
        <li key={`oli_${blockIdx++}_${listItems.length}`} className="leading-relaxed font-medium">
          {renderInline(olMatch[1])}
        </li>
      );
      continue;
    }

    // 9. Standard Paragraph
    flushList();
    nodes.push(
      <p key={`p_${blockIdx++}`} className="text-slate-700 leading-relaxed text-sm sm:text-base my-3">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return (
    <div className={`space-y-3 text-slate-800 leading-relaxed ${className}`} dir="rtl">
      {nodes}
    </div>
  );
}
