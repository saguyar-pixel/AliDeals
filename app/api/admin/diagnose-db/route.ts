import { NextRequest, NextResponse } from "next/server";
import { jsonDb, supabaseDb, ProductRecord } from "@/lib/db";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured, getSupabaseConfig } from "@/lib/supabase/client";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Diagnostic & One-Click DB Sync API
 * Provides 100% transparency on Supabase cloud state vs Local JSON DB,
 * pinpoints schema mismatches, and allows 1-click push of all products.
 */
export async function GET(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const localProducts = jsonDb.getProducts() || [];
    const localPages = jsonDb.getPages() || [];
    const localCategories = jsonDb.getCategories() || [];

    const config = getSupabaseConfig();
    const isConfig = isSupabaseConfigured();

    let supabaseReport: {
      isConfigured: boolean;
      url: string;
      hasServiceKey: boolean;
      connected: boolean;
      productsTableExists: boolean;
      productsCount: number;
      sitesTableExists: boolean;
      categoriesTableExists: boolean;
      pagesTableExists: boolean;
      productsError: string | null;
      productsErrorCode: string | null;
    } = {
      isConfigured: isConfig,
      url: config.url ? `${config.url.slice(0, 25)}...` : "לא מוגדר",
      hasServiceKey: Boolean(config.serviceRoleKey),
      connected: false,
      productsTableExists: false,
      productsCount: 0,
      sitesTableExists: false,
      categoriesTableExists: false,
      pagesTableExists: false,
      productsError: null,
      productsErrorCode: null,
    };

    if (isConfig) {
      const client = getSupabaseServerClient();
      if (client) {
        // 1. Test Products Table
        try {
          const { count, error } = await client
            .from("products")
            .select("id", { count: "exact", head: true });

          if (error) {
            supabaseReport.productsError = error.message;
            supabaseReport.productsErrorCode = error.code || null;
            supabaseReport.productsTableExists = error.code !== "42P01"; // 42P01 = undefined table
          } else {
            supabaseReport.connected = true;
            supabaseReport.productsTableExists = true;
            supabaseReport.productsCount = count || 0;
          }
        } catch (e: any) {
          supabaseReport.productsError = e?.message || "Connection exception";
        }

        // 2. Test Sites Table
        try {
          const { error } = await client.from("sites").select("id", { count: "exact", head: true });
          supabaseReport.sitesTableExists = !error;
        } catch {}

        // 3. Test Categories Table
        try {
          const { error } = await client.from("categories").select("id", { count: "exact", head: true });
          supabaseReport.categoriesTableExists = !error;
        } catch {}

        // 4. Test Pages Table
        try {
          const { error } = await client.from("pages").select("id", { count: "exact", head: true });
          supabaseReport.pagesTableExists = !error;
        } catch {}
      }
    }

    let statusDescription = "";
    if (!isConfig) {
      statusDescription = "המערכת פועלת כרגע במצב JSON מקומי בלבד. Supabase אינו מוגדר.";
    } else if (!supabaseReport.productsTableExists) {
      statusDescription = "טבלת products אינה קיימת ב-Supabase! יש להריץ את סקריפט ה-SQL (scripts/supabase_schema.sql) בעורך ה-SQL של Supabase.";
    } else if (supabaseReport.productsError) {
      statusDescription = `שגיאה בגישה ל-Supabase: ${supabaseReport.productsError} (קוד ${supabaseReport.productsErrorCode})`;
    } else if (supabaseReport.productsCount === 0 && localProducts.length > 0) {
      statusDescription = `טבלת Supabase מחוברת אך ריקה! יש ${localProducts.length} מוצרים ב-JSON המקומי שטרם סונכרנו. לחץ 'סנכרן מאגר עכשיו' להעלאה מיידית.`;
    } else {
      statusDescription = `הכל תקין! Supabase מחובר ומכיל ${supabaseReport.productsCount} מוצרים (ב-JSON יש ${localProducts.length}).`;
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      statusDescription,
      local: {
        productsCount: localProducts.length,
        pagesCount: localPages.length,
        categoriesCount: localCategories.length,
      },
      supabase: supabaseReport,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/admin/diagnose-db
 * Pushes all products from local JSON DB into Supabase with resilient fallbacks
 */
export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json({ error: "גישה נדחתה: אין הרשאת מנהל" }, { status: 403 });
    }

    const client = getSupabaseServerClient();
    if (!client) {
      return NextResponse.json(
        { success: false, error: "Supabase אינו מוגדר בסביבה הנוכחית (חסר URL או מפתח)" },
        { status: 400 }
      );
    }

    const localProducts = jsonDb.getProducts() || [];
    if (localProducts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "אין מוצרים ב-JSON המקומי לסנכרון",
        syncedCount: 0,
      });
    }

    let syncedCount = 0;
    const errors: Array<{ aliId: string; error: string }> = [];

    for (const prod of localProducts) {
      try {
        const res = await supabaseDb.upsertProduct(prod);
        if (res) {
          syncedCount++;
        }
      } catch (err: any) {
        errors.push({
          aliId: prod.aliId || prod.id,
          error: err.message || "שגיאה בסנכרון מוצר",
        });
      }
    }

    try {
      revalidatePath("/");
      revalidatePath("/admin/products");
    } catch {}

    return NextResponse.json({
      success: true,
      message: `סונכרנו בהצלחה ${syncedCount} מתוך ${localProducts.length} מוצרים ל-Supabase!`,
      totalLocal: localProducts.length,
      syncedCount,
      errorsCount: errors.length,
      errors: errors.slice(0, 10),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
