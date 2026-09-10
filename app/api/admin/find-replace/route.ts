import { NextRequest, NextResponse } from "next/server";
import { jsonDb } from "@/lib/db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { safeGitCommitAndPush } from "@/lib/security/safe-git";
import { safeWriteJson } from "@/lib/agent/storage-helper";

interface MatchItem {
  type: "page" | "product";
  id: string;
  title: string;
  field: string;
  snippet: string;
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const { findText, replaceText, scope = "all", dryRun = false } = await req.json();

    if (!findText || typeof findText !== "string" || !findText.trim()) {
      return NextResponse.json({ error: "חובה להזין טקסט או קישור לחיפוש" }, { status: 400 });
    }

    const needle = findText.trim();
    const replacement = replaceText !== undefined ? String(replaceText) : "";

    const pages = jsonDb.getPages();
    const products = jsonDb.getProducts();

    const matches: MatchItem[] = [];
    let updatedPagesCount = 0;
    let updatedProductsCount = 0;

    // 1. Search & Replace in Pages
    if (scope === "all" || scope === "pages") {
      pages.forEach((page) => {
        let changed = false;
        const checkFields: Array<keyof typeof page> = [
          "contentMarkdown",
          "directAnswerGeo",
          "title",
          "metaTitle",
          "metaDescription",
        ];

        checkFields.forEach((field) => {
          const val = String((page as any)[field] || "");
          if (val.includes(needle)) {
            changed = true;
            // Generate context snippet
            const idx = val.indexOf(needle);
            const start = Math.max(0, idx - 40);
            const end = Math.min(val.length, idx + needle.length + 40);
            matches.push({
              type: "page",
              id: page.id,
              title: page.title,
              field: String(field),
              snippet: `...${val.substring(start, end)}...`,
            });

            if (!dryRun) {
              (page as any)[field] = val.split(needle).join(replacement);
            }
          }
        });

        if (changed && !dryRun) {
          page.updatedAt = new Date().toISOString();
          updatedPagesCount++;
        }
      });
    }

    // 2. Search & Replace in Products
    if (scope === "all" || scope === "products") {
      products.forEach((prod) => {
        let changed = false;
        const checkFields: Array<keyof typeof prod> = [
          "affiliateUrl",
          "aliUrl",
          "titleHe",
          "originalTitle",
          "mainImage",
        ];

        checkFields.forEach((field) => {
          const val = String((prod as any)[field] || "");
          if (val.includes(needle)) {
            changed = true;
            const idx = val.indexOf(needle);
            const start = Math.max(0, idx - 30);
            const end = Math.min(val.length, idx + needle.length + 30);
            matches.push({
              type: "product",
              id: prod.id,
              title: prod.titleHe || prod.originalTitle,
              field: String(field),
              snippet: `...${val.substring(start, end)}...`,
            });

            if (!dryRun) {
              (prod as any)[field] = val.split(needle).join(replacement);
            }
          }
        });

        if (changed && !dryRun) {
          prod.updatedAt = new Date().toISOString();
          updatedProductsCount++;
        }
      });
    }

    // If actual run, save changes
    if (!dryRun) {
      if (updatedPagesCount > 0) {
        safeWriteJson("pages.json", pages);
      }
      if (updatedProductsCount > 0) {
        safeWriteJson("products.json", products);
      }

      if (updatedPagesCount > 0 || updatedProductsCount > 0) {
        safeGitCommitAndPush(
          `CMS Find & Replace: "${needle.slice(0, 20)}" -> "${replacement.slice(0, 20)}"`
        ).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      dryRun,
      matchesCount: matches.length,
      updatedPagesCount,
      updatedProductsCount,
      matches,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Find & Replace failed" }, { status: 500 });
  }
}
