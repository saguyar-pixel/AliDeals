import { NextRequest, NextResponse } from "next/server";
import { verifyAdminAccess } from "@/lib/security/firewall";
import { supabaseDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    if (!verifyAdminAccess(req)) {
      return NextResponse.json(
        { success: false, error: "גישה נדחתה: נדרשת הרשאת מנהל" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { id, isActive, actor = "admin" } = body;

    if (!id || typeof isActive !== "boolean") {
      return NextResponse.json(
        { success: false, error: "חסרים פרמטרים תקינים (id, isActive)" },
        { status: 400 }
      );
    }

    const ok = await supabaseDb.toggleCodeSnippet(id, isActive, actor);

    return NextResponse.json({
      success: ok,
      message: ok
        ? `סטטוס מקטע הקוד עודכן ל-${isActive ? "פעיל" : "מושבת"} והשינוי תועד בלוג!`
        : "מקטע הקוד לא נמצא",
      id,
      isActive,
    });
  } catch (err: any) {
    console.error("POST /api/admin/code-snippets/toggle error:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to toggle code snippet" },
      { status: 500 }
    );
  }
}
