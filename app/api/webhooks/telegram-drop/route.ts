import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface TelegramDropPayload {
  type?: "price_drop" | "new_coupon" | "deal_drop" | "flash_sale";
  title: string;
  priceUsd: number;
  originalPriceUsd?: number;
  priceIls?: number;
  couponCode?: string;
  discountText?: string;
  productUrl: string;
  imageUrl?: string;
  subId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("x-webhook-secret");
    const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET || process.env.CRON_SECRET;

    if (expectedSecret && authHeader !== `Bearer ${expectedSecret}` && authHeader !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized webhook caller" }, { status: 401 });
    }

    const body: TelegramDropPayload = await req.json();

    if (!body.title || !body.productUrl) {
      return NextResponse.json(
        { error: "Missing required fields: title and productUrl are required" },
        { status: 400 }
      );
    }

    const subId = body.subId || "telegram_drop";
    let affiliateUrl = body.productUrl;
    const sep = affiliateUrl.includes("?") ? "&" : "?";
    if (!affiliateUrl.includes("sub_id=")) {
      affiliateUrl = `${affiliateUrl}${sep}sub_id=${subId}`;
    }

    const priceUsd = Number(body.priceUsd) || 0;
    const priceIls = body.priceIls || Math.round(priceUsd * 3.65);
    const originalPrice = body.originalPriceUsd ? Number(body.originalPriceUsd) : null;
    const discountRate = originalPrice && originalPrice > priceUsd
      ? Math.round(((originalPrice - priceUsd) / originalPrice) * 100)
      : null;

    // Format high-converting Telegram Markdown message
    const lines: string[] = [];
    
    if (body.type === "new_coupon") {
      lines.push("🎟️ *קופון בזק בלעדי התגלה! | AliDeals Drops* ⚡");
    } else if (body.type === "flash_sale") {
      lines.push("⚡ *מבצע בזק מוגבל בזמן! | AliDeals Drops* 🔥");
    } else {
      lines.push("🔥 *התראת ירידת מחיר רותחת! | AliDeals Drops* 📉");
    }
    
    lines.push("");
    lines.push(`📦 *${escapeMarkdown(body.title)}*`);
    lines.push("");
    
    if (originalPrice && discountRate) {
      lines.push(`💰 *מחיר עכשיו:* $${priceUsd.toFixed(2)} (~₪${priceIls})`);
      lines.push(`🏷️ מחיר קודם: ~$${originalPrice.toFixed(2)}~ *(${discountRate}% הנחה)*`);
    } else {
      lines.push(`💰 *מחיר בלעדי:* $${priceUsd.toFixed(2)} (~₪${priceIls})`);
    }

    if (body.couponCode) {
      lines.push("");
      lines.push(`✂️ *קוד קופון להעתקה בקופה:* \`${body.couponCode}\``);
      if (body.discountText) {
        lines.push(`🎁 הטבה: ${escapeMarkdown(body.discountText)}`);
      }
    }

    lines.push("");
    lines.push(priceUsd <= 75 ? "✅ *פטור מלא ממכס ומע\"מ (מתחת ל-$75)!*" : "⚠️ *מעל $75 - כפוף למע\"מ (17%)*");
    lines.push("");
    lines.push(`🛒 *לרכישה מיידית באלי אקספרס:*`);
    lines.push(`👉 [לחצו כאן לפתיחת המוצר](${affiliateUrl})`);
    lines.push("");
    lines.push("🇮🇱 *משלוח ישיר לישראל | AliDeals חוסכים לכם ברשת*");

    const formattedMessage = lines.join("\n");

    // Check if Telegram Bot credentials are configured
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;

    let delivered = false;
    let telegramResponse: any = null;

    if (botToken && chatId) {
      try {
        if (body.imageUrl) {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              photo: body.imageUrl,
              caption: formattedMessage,
              parse_mode: "Markdown",
            }),
          });
          telegramResponse = await res.json();
          delivered = telegramResponse.ok === true;
        } else {
          const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: chatId,
              text: formattedMessage,
              parse_mode: "Markdown",
              disable_web_page_preview: false,
            }),
          });
          telegramResponse = await res.json();
          delivered = telegramResponse.ok === true;
        }
      } catch (err) {
        console.error("Failed to send Telegram message:", err);
      }
    }

    return NextResponse.json({
      success: true,
      delivered,
      telegramConfigured: Boolean(botToken && chatId),
      formattedMessage,
      affiliateUrl,
      telegramResponse,
    });
  } catch (error: any) {
    console.error("Telegram drop webhook error:", error);
    return NextResponse.json({ error: error?.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return NextResponse.json({
    status: "online",
    endpoint: "/api/webhooks/telegram-drop",
    description: "Webhook Dispatcher for AliDeals Telegram & WhatsApp Drop notifications",
    configured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    usage: {
      method: "POST",
      body: {
        type: "price_drop | new_coupon | flash_sale",
        title: "Xiaomi Smart Air Purifier 4",
        priceUsd: 49.99,
        originalPriceUsd: 69.99,
        couponCode: "ALIISRAEL5",
        productUrl: "https://s.click.aliexpress.com/e/_example",
        imageUrl: "https://ae01.alicdn.com/kf/example.jpg",
      },
    },
  });
}

function escapeMarkdown(text: string): string {
  // Escape Telegram standard markdown characters that could break parsing
  return text.replace(/[_*[\]()~`>#+\-=|{}.!]/g, (match) => {
    // Only escape if needed for simple markdown
    if (["_", "*", "[", "]", "`"].includes(match)) {
      return `\\${match}`;
    }
    return match;
  });
}
