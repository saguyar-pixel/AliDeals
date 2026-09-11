import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { analyticsDb } from "@/lib/db/analytics-db";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { runDanaCroAnalysis } from "@/lib/analytics/cro-engine";

function parseCsvLines(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  // Determine separator (comma or tab or semicolon)
  const headerLine = lines[0];
  const sep = headerLine.includes("\t") ? "\t" : headerLine.includes(";") ? ";" : ",";

  const headers = headerLine.split(sep).map((h) => h.replace(/^["']|["']$/g, "").trim().toLowerCase());

  const records: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(sep).map((v) => v.replace(/^["']|["']$/g, "").trim());
    if (values.length < 2) continue;

    const row: Record<string, string> = {};
    headers.forEach((hdr, idx) => {
      row[hdr] = values[idx] || "";
    });
    records.push(row);
  }

  return records;
}

export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const clicks = await supabaseDb.getClicks(200);
    const gscQueries = await supabaseDb.getGscQueries();
    const ga4Stats = analyticsDb.getGa4Stats();
    const settings = await supabaseDb.getSettings();
    const conversions = await supabaseDb.getConversions(100);

    // Summary calculation
    const summary = runDanaCroAnalysis();

    return NextResponse.json({
      success: true,
      settings,
      summary,
      recentClicks: clicks,
      gscQueries: gscQueries.slice(0, 100),
      ga4Stats: ga4Stats.slice(0, 100),
      conversions: conversions.slice(0, 100),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to load analytics" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const body = await req.json();
    const { type, csvData, rawJson } = body;

    if (type === "gsc") {
      let itemsToImport: Array<{
        query: string;
        page?: string;
        clicks: number;
        impressions: number;
        ctr: number;
        position: number;
      }> = [];

      if (csvData && typeof csvData === "string") {
        const rows = parseCsvLines(csvData);
        itemsToImport = rows.map((r) => {
          // Detect query field
          const query = r["top queries"] || r["query"] || r["שאילתות מובילות"] || r["שאילתה"] || Object.values(r)[0] || "";
          const clicks = parseFloat(r["clicks"] || r["קליקים"] || "0") || 0;
          const impressions = parseFloat(r["impressions"] || r["חשיפות"] || "0") || 0;
          const ctr = parseFloat(String(r["ctr"] || r["שיעור קליקים"] || "0").replace("%", "")) || 0;
          const position = parseFloat(r["position"] || r["מיקום"] || "0") || 0;
          const page = r["page"] || r["top pages"] || r["דף"] || undefined;

          return { query, clicks, impressions, ctr, position, page };
        }).filter((item) => item.query && item.query.length > 1);
      } else if (Array.isArray(rawJson)) {
        itemsToImport = rawJson;
      }

      if (itemsToImport.length === 0) {
        return NextResponse.json({ error: "לא נמצאו שורות תקינות לייבוא מ-Search Console" }, { status: 400 });
      }

      const result = await supabaseDb.importGscQueries(itemsToImport);
      return NextResponse.json({
        success: true,
        message: `יובאו בהצלחה ${result.count} שאילתות מ-Google Search Console!`,
        count: result.count,
      });
    }

    if (type === "ga4") {
      let itemsToImport: Array<{
        pagePath: string;
        pageTitle?: string;
        views: number;
        users: number;
        bounceRate?: number;
      }> = [];

      if (csvData && typeof csvData === "string") {
        const rows = parseCsvLines(csvData);
        itemsToImport = rows.map((r) => {
          const pagePath = r["page path and screen class"] || r["page path"] || r["page"] || r["נתיב דף"] || Object.values(r)[0] || "";
          const pageTitle = r["page title and screen class"] || r["page title"] || r["כותרת דף"] || undefined;
          const views = parseFloat(r["views"] || r["צפיות"] || "0") || 0;
          const users = parseFloat(r["users"] || r["total users"] || r["משתמשים"] || "0") || 0;
          const bounceRate = parseFloat(String(r["bounce rate"] || r["שיעור עזיבה"] || "0").replace("%", "")) || 0;

          return { pagePath, pageTitle, views, users, bounceRate };
        }).filter((item) => item.pagePath && item.pagePath.length > 0);
      } else if (Array.isArray(rawJson)) {
        itemsToImport = rawJson;
      }

      if (itemsToImport.length === 0) {
        return NextResponse.json({ error: "לא נמצאו שורות תקינות לייבוא מ-Google Analytics 4" }, { status: 400 });
      }

      const result = analyticsDb.importGa4Stats(itemsToImport);
      return NextResponse.json({
        success: true,
        message: `יובאו בהצלחה ${result.count} עמודים מ-Google Analytics 4!`,
        count: result.count,
      });
    }

    return NextResponse.json({ error: "סוג ייבוא לא חוקי (נדרש 'gsc' או 'ga4')" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to import analytics" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "all") as "all" | "clicks" | "gsc" | "ga4";

    await supabaseDb.clearAnalytics(type);
    return NextResponse.json({ success: true, message: `נתוני ${type} אופסו בהצלחה` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to reset analytics" }, { status: 500 });
  }
}
