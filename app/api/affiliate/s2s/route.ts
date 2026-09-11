import { NextRequest, NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db/supabase-db";
import { addAgentLog, saveOrchestratorMessage } from "@/lib/agent/team-orchestrator";

/**
 * S2S (Server-to-Server) Postback Webhook
 * Handles incoming conversion notifications from affiliate networks (AliExpress, Admitad, etc.)
 * Supports both GET (Query params) and POST (JSON body or form data).
 *
 * Example GET:
 * /api/affiliate/s2s?order_id=123456&commission=4.80&amount=65.00&sub_id=rev_hy300&item_id=100500612345
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const orderId =
      url.searchParams.get("order_id") ||
      url.searchParams.get("orderId") ||
      url.searchParams.get("transaction_id") ||
      `ord_${Date.now()}`;

    const subId =
      url.searchParams.get("sub_id") ||
      url.searchParams.get("subid") ||
      url.searchParams.get("click_id") ||
      undefined;

    const productId =
      url.searchParams.get("product_id") ||
      url.searchParams.get("item_id") ||
      url.searchParams.get("ali_id") ||
      undefined;

    const productTitle =
      url.searchParams.get("product_title") ||
      url.searchParams.get("title") ||
      undefined;

    const amountUsd = parseFloat(
      url.searchParams.get("amount") ||
      url.searchParams.get("order_amount") ||
      url.searchParams.get("sale_amount") ||
      "0"
    ) || 0;

    let commissionUsd = parseFloat(
      url.searchParams.get("commission") ||
      url.searchParams.get("commission_usd") ||
      url.searchParams.get("payout") ||
      "0"
    ) || 0;

    // If commission is 0 but amount exists, estimate typical 7% affiliate rate
    if (commissionUsd === 0 && amountUsd > 0) {
      commissionUsd = Math.round(amountUsd * 0.07 * 100) / 100;
    }

    const commissionIls = Math.round(commissionUsd * 3.65 * 100) / 100;

    const rawStatus = (
      url.searchParams.get("status") || "approved"
    ).toLowerCase();
    const status: "approved" | "pending" | "rejected" =
      rawStatus === "pending"
        ? "pending"
        : rawStatus === "rejected"
        ? "rejected"
        : "approved";

    const source = url.searchParams.get("source") || "aliexpress_s2s";

    const conversion = await supabaseDb.recordConversion({
      orderId,
      subId,
      productId,
      productTitle,
      orderAmountUsd: amountUsd,
      commissionUsd,
      commissionIls,
      status,
      source,
      rawPayload: Object.fromEntries(url.searchParams.entries()),
    });

    // 1. Add Log to Dana & Orchestrator
    addAgentLog(
      "analyst",
      "דנה",
      "success",
      `התקבל דיווח S2S חי: הזמנה #${orderId} | עמלה: $${commissionUsd} (₪${commissionIls}) | סטטוס: ${status} | SubID: ${subId || "כללי"}`
    );

    // 2. Alon notifies marketer in team chat
    if (status === "approved" || status === "pending") {
      saveOrchestratorMessage({
        id: `msg_s2s_${Date.now()}`,
        sender: "orchestrator",
        text: `🎉 **יש מכירה חדשה דרך האתר! (דיווח S2S חי)**\n\n💰 **עמלה שהרווחת:** $${commissionUsd} (כ-₪${commissionIls})\n📦 **סכום הזמנה:** $${amountUsd}\n🆔 **מספר הזמנה:** \`${orderId}\`\n🎯 **מקור תנועה (SubID):** \`${subId || "כללי"}\`\n\nדנה עדכנה את חישוב הרווח היומי וההתקדמות לעבר היעד של $100 ליום! 🚀`,
        timestamp: new Date().toLocaleTimeString("he-IL", { hour12: false }),
      });
    }

    return NextResponse.json({
      success: true,
      recordedId: conversion.id,
      orderId,
      commissionUsd,
      commissionIls,
      status,
    });
  } catch (err: any) {
    console.error("S2S GET postback error:", err);
    return NextResponse.json({ error: err.message || "Failed to process S2S postback" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, any> = {};
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("application/json")) {
      body = await req.json().catch(() => ({}));
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      formData.forEach((val, key) => {
        body[key] = typeof val === "string" ? val : val.name;
      });
    } else {
      const text = await req.text();
      try {
        body = JSON.parse(text);
      } catch {
        // Parse as query string
        const params = new URLSearchParams(text);
        body = Object.fromEntries(params.entries());
      }
    }

    const orderId =
      body.order_id ||
      body.orderId ||
      body.transaction_id ||
      body.id ||
      `ord_${Date.now()}`;

    const subId =
      body.sub_id ||
      body.subid ||
      body.click_id ||
      body.custom_id ||
      undefined;

    const productId =
      body.product_id ||
      body.item_id ||
      body.ali_id ||
      undefined;

    const productTitle =
      body.product_title ||
      body.title ||
      undefined;

    const amountUsd = parseFloat(
      String(body.amount || body.order_amount || body.sale_amount || 0)
    ) || 0;

    let commissionUsd = parseFloat(
      String(body.commission || body.commission_usd || body.payout || 0)
    ) || 0;

    if (commissionUsd === 0 && amountUsd > 0) {
      commissionUsd = Math.round(amountUsd * 0.07 * 100) / 100;
    }

    const commissionIls = Math.round(commissionUsd * 3.65 * 100) / 100;

    const rawStatus = String(body.status || "approved").toLowerCase();
    const status: "approved" | "pending" | "rejected" =
      rawStatus === "pending"
        ? "pending"
        : rawStatus === "rejected"
        ? "rejected"
        : "approved";

    const source = String(body.source || "aliexpress_s2s_post");

    const conversion = await supabaseDb.recordConversion({
      orderId: String(orderId),
      subId: subId ? String(subId) : undefined,
      productId: productId ? String(productId) : undefined,
      productTitle: productTitle ? String(productTitle) : undefined,
      orderAmountUsd: amountUsd,
      commissionUsd,
      commissionIls,
      status,
      source,
      rawPayload: body,
    });

    // 1. Add Log
    addAgentLog(
      "analyst",
      "דנה",
      "success",
      `התקבל דיווח S2S POST חי: הזמנה #${orderId} | עמלה: $${commissionUsd} (₪${commissionIls}) | סטטוס: ${status}`
    );

    // 2. Chat notification
    if (status === "approved" || status === "pending") {
      saveOrchestratorMessage({
        id: `msg_s2s_${Date.now()}`,
        sender: "orchestrator",
        text: `🎉 **יש מכירה חדשה דרך האתר! (דיווח S2S חי)**\n\n💰 **עמלה שהרווחת:** $${commissionUsd} (כ-₪${commissionIls})\n📦 **סכום הזמנה:** $${amountUsd}\n🆔 **מספר הזמנה:** \`${orderId}\`\n🎯 **מקור תנועה (SubID):** \`${subId || "כללי"}\`\n\nדנה עדכנה את חישוב הרווח היומי וההתקדמות לעבר היעד של $100 ליום! 🚀`,
        timestamp: new Date().toLocaleTimeString("he-IL", { hour12: false }),
      });
    }

    return NextResponse.json({
      success: true,
      recordedId: conversion.id,
      orderId,
      commissionUsd,
      commissionIls,
      status,
    });
  } catch (err: any) {
    console.error("S2S POST postback error:", err);
    return NextResponse.json({ error: err.message || "Failed to process S2S postback" }, { status: 500 });
  }
}
