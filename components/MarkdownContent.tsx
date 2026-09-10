import React from "react";

interface MarkdownContentProps {
  content: string;
  className?: string;
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
 * Format inline text styles (Bold, Italic, Code, Links)
 */
function renderInline(text: string): React.ReactNode[] {
  // Tokenize text into bold, link, code, italic, and plain text
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
      tokens.push(
        <a
          key={`a_${keyIdx++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="text-ali-600 hover:text-ali-700 underline font-semibold transition-colors"
        >
          {linkMatch[1]}
        </a>
      );
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

    // 4. Italic: *text* (excluding escaped or lone asterisks)
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
      // Delimiter matched but failed pattern, consume 1 character to avoid infinite loop
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

export default function MarkdownContent({ content, className = "" }: MarkdownContentProps) {
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
        <ul key={`ul_${blockIdx++}`} className="list-disc pr-6 space-y-2 my-4 text-slate-700 leading-relaxed text-sm sm:text-base">
          {listItems}
        </ul>
      );
      inUnorderedList = false;
      listItems = [];
    } else if (inOrderedList) {
      nodes.push(
        <ol key={`ol_${blockIdx++}`} className="list-decimal pr-6 space-y-2 my-4 text-slate-700 leading-relaxed text-sm sm:text-base">
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

    // Headers
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
        <h3 key={`h3_${blockIdx++}`} className="text-lg sm:text-xl font-bold text-slate-900 mt-6 mb-3 flex items-center gap-2">
          <span className="w-1.5 h-4 rounded-full bg-ali-500 inline-block"></span>
          <span>{renderInline(line.slice(4))}</span>
        </h3>
      );
      continue;
    }
    if (line.startsWith("## ")) {
      flushList();
      nodes.push(
        <h2 key={`h2_${blockIdx++}`} className="text-xl sm:text-2xl font-black text-slate-950 mt-8 mb-4 border-b border-slate-100 pb-2">
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

    // Blockquote
    if (line.startsWith("> ")) {
      flushList();
      nodes.push(
        <blockquote
          key={`bq_${blockIdx++}`}
          className="p-4 my-4 rounded-2xl bg-slate-50 border-r-4 border-ali-500 text-slate-700 text-sm sm:text-base italic leading-relaxed"
        >
          {renderInline(line.slice(2))}
        </blockquote>
      );
      continue;
    }

    // Horizontal Rule
    if (line === "---" || line === "***" || line === "___") {
      flushList();
      nodes.push(<hr key={`hr_${blockIdx++}`} className="my-6 border-slate-200" />);
      continue;
    }

    // Unordered List Items: * item, - item, • item
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

    // Ordered List Items: 1. item, 2. item
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

    // Standard Paragraph
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
