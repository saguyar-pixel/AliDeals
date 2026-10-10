import { NextRequest, NextResponse } from "next/server";
import {
  researchRonKeywordsAndLsi,
  generateRonSeoArticle,
  saveRonSeoArticleToDb,
  POPULAR_ISRAELI_ALIEXPRESS_TOPICS,
  RonKeywordResearch,
  RonSeoArticleOutput,
} from "@/lib/agent/ron-seo-generator";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { supabaseDb, jsonDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    // 1. Fetch recent articles
    let recentArticles: any[] = [];
    try {
      if (supabaseDb.isConfigured()) {
        const pages = await supabaseDb.getPages();
        recentArticles = pages
          .filter((p) => p.type === "article" || p.type === "guide")
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
      } else {
        const pages = jsonDb.getPages();
        recentArticles = pages
          .filter((p) => p.type === "article" || p.type === "guide")
          .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
          .slice(0, 10);
      }
    } catch (e) {
      console.warn("Failed fetching recent articles:", e);
    }

    return NextResponse.json({
      success: true,
      popularTopics: POPULAR_ISRAELI_ALIEXPRESS_TOPICS,
      recentArticles,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה בטעינת נתוני מאמרים" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל." }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      action = "generate",
      topic,
      focusKeyword,
      category = "מדריכי קנייה וצרכנות",
      targetAudience,
      customInstructions,
      existingResearch,
      article,
      status = "published",
    } = body;

    // Action: Publish existing article
    if (action === "publish") {
      if (!article || !article.title || !article.slug) {
        return NextResponse.json(
          { error: "חסרים נתוני מאמר לפרסום" },
          { status: 400 }
        );
      }
      const saveRes = await saveRonSeoArticleToDb(article as RonSeoArticleOutput, status);
      return NextResponse.json({
        success: true,
        message: `המאמר "${article.title}" נשמר ופורסם בהצלחה באתר!`,
        publicUrl: saveRes.publicUrl,
        pageId: saveRes.pageId,
        slug: saveRes.slug,
      });
    }

    // Validation for research / generation
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json(
        { error: "נא להזין נושא או מונח חיפוש עבור רון" },
        { status: 400 }
      );
    }

    const cleanTopic = topic.trim();

    // Action 1: Research only
    if (action === "research") {
      const research = await researchRonKeywordsAndLsi(cleanTopic, {
        category,
        targetAudience,
        additionalNotes: customInstructions,
      });

      return NextResponse.json({
        success: true,
        action: "research_completed",
        research,
      });
    }

    // Action 2: Generate Full Article (with optional auto-publish)
    if (action === "generate" || action === "full_flow") {
      const generatedArticle = await generateRonSeoArticle({
        topic: cleanTopic,
        focusKeyword,
        category,
        targetAudience,
        customInstructions,
        existingResearch: existingResearch as RonKeywordResearch | undefined,
      });

      let saveInfo = null;
      if (action === "full_flow" || body.saveImmediately) {
        saveInfo = await saveRonSeoArticleToDb(generatedArticle, status);
      }

      return NextResponse.json({
        success: true,
        action: action === "full_flow" ? "published" : "generated",
        article: generatedArticle,
        saveInfo,
      });
    }

    return NextResponse.json({ error: `פעולה לא מוכרת: ${action}` }, { status: 400 });
  } catch (err: any) {
    console.error("Ron SEO article API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "שגיאה ביצירת מאמר ה-SEO של רון" },
      { status: 500 }
    );
  }
}
