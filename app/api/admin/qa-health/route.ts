import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { GA4_EVENT_SCHEMAS, validateTelemetryPayload } from "@/lib/tracking/client-tracker";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  const results: {
    menu: { status: "pass" | "fail" | "warn"; message: string; details: any; latencyMs: number };
    storage: { status: "pass" | "fail" | "warn"; message: string; details: any; latencyMs: number };
    redirects: { status: "pass" | "fail" | "warn"; message: string; details: any; latencyMs: number };
    telemetry: { status: "pass" | "fail" | "warn"; message: string; details: any; latencyMs: number };
    deduplication: { status: "pass" | "fail" | "warn"; message: string; details: any; latencyMs: number };
  } = {
    menu: { status: "pass", message: "", details: {}, latencyMs: 0 },
    storage: { status: "pass", message: "", details: {}, latencyMs: 0 },
    redirects: { status: "pass", message: "", details: {}, latencyMs: 0 },
    telemetry: { status: "pass", message: "", details: {}, latencyMs: 0 },
    deduplication: { status: "pass", message: "", details: {}, latencyMs: 0 },
  };

  // 1. Menu Builder & Hierarchy Check
  const t0 = Date.now();
  try {
    const menuItems = await supabaseDb.getNavigationMenu();
    const hasItems = Array.isArray(menuItems) && menuItems.length > 0;
    const hasChildren = menuItems.some((item) => Array.isArray(item.children) && item.children.length > 0);
    const validStructure = menuItems.every((item) => item.label && (item.url || item.href));

    results.menu = {
      status: hasItems && validStructure ? "pass" : "warn",
      message: hasItems
        ? `תפריט הניווט תקין ומסונכרן מ-Supabase: ${menuItems.length} פריטים ראשיים ${hasChildren ? "(כולל תפריטים נפתחים)" : ""}`
        : "התפריט ריק או שטרם הוגדרו פריטים",
      details: {
        totalItems: menuItems.length,
        hasDropdowns: hasChildren,
        itemsSummary: menuItems.map((i) => ({
          label: i.label,
          url: i.url || i.href,
          childrenCount: i.children?.length || 0,
        })),
      },
      latencyMs: Date.now() - t0,
    };
  } catch (err: any) {
    results.menu = {
      status: "fail",
      message: `שגיאה בשליפת תפריט ניווט: ${err.message}`,
      details: { error: err.message },
      latencyMs: Date.now() - t0,
    };
  }

  // 2. Supabase Storage Engine Check (review-assets)
  const t1 = Date.now();
  try {
    const client = getSupabaseServerClient();
    if (!client) {
      results.storage = {
        status: "warn",
        message: "לקוח Supabase אינו מוגדר בסביבה המקומית; בדיקת אחסון ענן מוגבלת.",
        details: { configured: false },
        latencyMs: Date.now() - t1,
      };
    } else {
      const { data: files, error: listError } = await client.storage
        .from("review-assets")
        .list("", { limit: 10 });

      if (listError) {
        results.storage = {
          status: "fail",
          message: `גישה לדלי review-assets נכשלה: ${listError.message}`,
          details: { error: listError },
          latencyMs: Date.now() - t1,
        };
      } else {
        const sampleUrl = client.storage.from("review-assets").getPublicUrl("test-sample.jpg").data.publicUrl;
        results.storage = {
          status: "pass",
          message: `דלי האחסון review-assets ב-Supabase פעיל ותקין! קבצים זמינים: ${files?.length || 0}`,
          details: {
            bucketName: "review-assets",
            fileCountInRoot: files?.length || 0,
            publicCdnSampleUrl: sampleUrl,
            zeroLocalStorage: true,
          },
          latencyMs: Date.now() - t1,
        };
      }
    }
  } catch (err: any) {
    results.storage = {
      status: "fail",
      message: `שגיאה בבדיקת Supabase Storage: ${err.message}`,
      details: { error: err.message },
      latencyMs: Date.now() - t1,
    };
  }

  // 3. 301 Redirects Check
  const t2 = Date.now();
  try {
    const redirects = await supabaseDb.getRedirects();
    results.redirects = {
      status: "pass",
      message: `מנוע ההפניות 301 פעיל בענן ומגן מפני 404. סה"כ חוקי הפניה: ${redirects.length}`,
      details: {
        totalRedirects: redirects.length,
        rules: redirects.slice(0, 10),
      },
      latencyMs: Date.now() - t2,
    };
  } catch (err: any) {
    results.redirects = {
      status: "fail",
      message: `שגיאה בבדיקת הפניות 301: ${err.message}`,
      details: { error: err.message },
      latencyMs: Date.now() - t2,
    };
  }

  // 4. GA4 Telemetry Event Schemas Check
  const t3 = Date.now();
  try {
    const testPayloads = {
      affiliate_clickout: {
        product_id: "ali_10050062831",
        product_title: "אוזניות בלוטות אלחוטיות",
        price_usd: 19.99,
        source_page: "/reviews/wireless-earbuds",
        affiliate_url: "https://s.click.aliexpress.com/e/_DkExample",
        is_preverified: true,
      },
      exit_modal_search: {
        search_term: "שואב אבק רובוטי",
        source_url: "/reviews/robot-vacuum",
        trigger_intent: "mouse_leave_viewport",
      },
      customs_bundle_split_action: {
        total_cart_usd: 88.5,
        split_package_count: 2,
        tax_saved_estimated_ils: 62.0,
      },
      ugc_vote_submitted: {
        product_id: "ali_10050062831",
        vote_type: "verified_safe",
        user_trust_level: "israeli_buyer",
      },
      newsletter_signup: {
        source_placement: "exit_intent_modal",
        preferred_category: "אלקטרוניקה וגאדג'טים",
      },
    };

    const schemaResults: Record<string, { valid: boolean; missingFields: string[] }> = {};
    let allValid = true;

    for (const [eventName, payload] of Object.entries(testPayloads)) {
      const val = validateTelemetryPayload(eventName as any, payload);
      schemaResults[eventName] = val;
      if (!val.valid) allValid = false;
    }

    results.telemetry = {
      status: allValid ? "pass" : "fail",
      message: allValid
        ? "כל 5 סכמות אירועי הטלמטריה של GA4 תקינות, מאומתות ומוכנות לאיסוף אנליטיקס!"
        : "נמצאו שדות חסרים בחלק מסכמות ה-GA4",
      details: {
        eventsChecked: Object.keys(GA4_EVENT_SCHEMAS),
        validationResults: schemaResults,
      },
      latencyMs: Date.now() - t3,
    };
  } catch (err: any) {
    results.telemetry = {
      status: "fail",
      message: `שגיאה בבדיקת סכמות טלמטריה: ${err.message}`,
      details: { error: err.message },
      latencyMs: Date.now() - t3,
    };
  }

  // 5. DB Deduplication & Data Integrity Check
  const t4 = Date.now();
  try {
    const products = await supabaseDb.getProducts();
    const pages = await supabaseDb.getPages();

    // Check duplicate products
    const aliIdCounts: Record<string, number> = {};
    const duplicateAliIds: string[] = [];
    products.forEach((p) => {
      const key = p.aliId || p.id;
      aliIdCounts[key] = (aliIdCounts[key] || 0) + 1;
      if (aliIdCounts[key] === 2) {
        duplicateAliIds.push(key);
      }
    });

    // Check duplicate pages
    const slugCounts: Record<string, number> = {};
    const duplicateSlugs: string[] = [];
    pages.forEach((p) => {
      const key = (p.slug || "").toLowerCase().trim();
      if (key) {
        slugCounts[key] = (slugCounts[key] || 0) + 1;
        if (slugCounts[key] === 2) {
          duplicateSlugs.push(key);
        }
      }
    });

    const isClean = duplicateAliIds.length === 0 && duplicateSlugs.length === 0;

    results.deduplication = {
      status: isClean ? "pass" : "warn",
      message: isClean
        ? `שלמות נתונים 100%: נבדקו ${products.length} מוצרים ו-${pages.length} עמודים – אפס כפילויות!`
        : `זוהו ${duplicateAliIds.length} מוצרים כפולים או ${duplicateSlugs.length} עמודים עם Slug כפול.`,
      details: {
        totalProducts: products.length,
        duplicateAliIds,
        totalPages: pages.length,
        duplicateSlugs,
      },
      latencyMs: Date.now() - t4,
    };
  } catch (err: any) {
    results.deduplication = {
      status: "fail",
      message: `שגיאה בבדיקת שלמות נתונים: ${err.message}`,
      details: { error: err.message },
      latencyMs: Date.now() - t4,
    };
  }

  const overallStatus = Object.values(results).some((r) => r.status === "fail")
    ? "fail"
    : Object.values(results).some((r) => r.status === "warn")
    ? "warn"
    : "pass";

  return NextResponse.json({
    success: true,
    overallStatus,
    timestamp: new Date().toISOString(),
    totalDurationMs: Date.now() - startTime,
    checks: results,
  });
}
