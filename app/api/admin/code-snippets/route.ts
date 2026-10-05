import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { supabaseDb } from "@/lib/db";
import { CustomCodeSnippet } from "@/lib/analytics/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const activeOnly = searchParams.get("activeOnly") === "true";
    const includeLogs = searchParams.get("includeLogs") !== "false";

    const [snippets, logs] = await Promise.all([
      supabaseDb.getCodeSnippets({ activeOnly }),
      includeLogs ? supabaseDb.getCodeSnippetLogs(100) : Promise.resolve([]),
    ]);

    return NextResponse.json({
      success: true,
      snippets,
      logs,
    });
  } catch (err: any) {
    console.error("GET /api/admin/code-snippets error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to fetch code snippets" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json(
        { success: false, error: "גישה נדחתה: נדרשת הרשאת מנהל" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const snippetData: Partial<CustomCodeSnippet> = body.snippet || body;
    const logDescription: string | undefined = body.logDescription;
    const actor: string = body.actor || "admin";

    if (!snippetData.title || !String(snippetData.title).trim()) {
      return NextResponse.json(
        { success: false, error: "חובה לציין שם/כותרת למקטע הקוד" },
        { status: 400 }
      );
    }

    if (snippetData.code === undefined || snippetData.code === null) {
      return NextResponse.json(
        { success: false, error: "חובה להזין את תוכן הקוד" },
        { status: 400 }
      );
    }

    const savedSnippet = await supabaseDb.upsertCodeSnippet(
      snippetData,
      logDescription,
      actor
    );

    return NextResponse.json({
      success: true,
      message: "מקטע הקוד נשמר בהצלחה והשינוי תועד בלוג!",
      snippet: savedSnippet,
    });
  } catch (err: any) {
    console.error("POST /api/admin/code-snippets error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to save code snippet" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json(
        { success: false, error: "גישה נדחתה: נדרשת הרשאת מנהל" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    let id = searchParams.get("id");
    let actor = searchParams.get("actor") || "admin";

    if (!id) {
      try {
        const body = await req.json();
        if (body.id) id = body.id;
        if (body.actor) actor = body.actor;
      } catch {}
    }

    if (!id) {
      return NextResponse.json(
        { success: false, error: "חסר מזהה מקטע קוד למחיקה (id)" },
        { status: 400 }
      );
    }

    const ok = await supabaseDb.deleteCodeSnippet(id, actor);

    return NextResponse.json({
      success: ok,
      message: ok ? "מקטע הקוד נמחק בהצלחה ונרשם בלוג השינויים" : "שגיאה במחיקת מקטע הקוד",
      id,
    });
  } catch (err: any) {
    console.error("DELETE /api/admin/code-snippets error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete code snippet" },
      { status: 500 }
    );
  }
}
