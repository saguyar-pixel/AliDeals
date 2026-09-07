import { runAutonomousReviewPipeline } from "./autonomous-worker";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const ALLOWED_TELEGRAM_USER_ID = process.env.TELEGRAM_CHAT_ID || "";

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) return;
  try {
    await fetch(`${TELEGRAM_API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
      }),
    });
  } catch (err) {
    console.error("Failed to send Telegram message:", err);
  }
}

/**
 * Long-polling Telegram Bot listener
 * Allows user to send any AliExpress URL from their phone directly to their 24/7 agent!
 */
export async function startTelegramAgentListener() {
  if (!TELEGRAM_BOT_TOKEN) {
    console.log("[Telegram Agent] TELEGRAM_BOT_TOKEN אינו מוגדר. סוכן הטלגרם מושבת.");
    return;
  }

  console.log("[Telegram Agent] סוכן הטלגרם האוטונומי פועל וממתין לפקודות 24/7...");
  let offset = 0;

  while (true) {
    try {
      const resp = await fetch(`${TELEGRAM_API_BASE}/getUpdates?offset=${offset}&timeout=30`, {
        signal: AbortSignal.timeout(35000),
      });

      if (!resp.ok) {
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }

      const data = await resp.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          const msg = update.message;
          if (!msg || !msg.text) continue;

          const chatId = msg.chat.id;
          const senderId = String(msg.from.id);

          // Security check: Only allow the owner
          if (ALLOWED_TELEGRAM_USER_ID && senderId !== ALLOWED_TELEGRAM_USER_ID) {
            await sendTelegramMessage(chatId, "⛔ גישה נדחתה: בוט זה מורשה לבעל האתר בלבד.");
            continue;
          }

          const text = msg.text.trim();

          // Check if message is an AliExpress link or product ID
          if (text.includes("aliexpress.com") || /^\d{10,20}$/.test(text)) {
            await sendTelegramMessage(
              chatId,
              `🤖 *הסוכן בפעולה!* קיבלתי את הקישור.\nשולף מפרט מאלי אקספרס ומפעיל את Gemini...`
            );

            const result = await runAutonomousReviewPipeline(text);

            if (result.success) {
              const liveUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://alideals.co.il"}${result.publicUrl}`;
              await sendTelegramMessage(
                chatId,
                `✅ *העמוד פורסם בהצלחה בדומיין שלך!*\n\n` +
                  `📌 *כותרת:* ${result.title}\n` +
                  `💰 *מחיר מבצע:* ₪${result.priceIls} ($${result.priceUsd})\n` +
                  `🚀 *קישור חי:* [צפה בעמוד באתר](${liveUrl})\n\n` +
                  `_השינויים נדחפו ל-GitHub Pages ומתעדכנים ברגעים אלו בענן._`
              );
            } else {
              await sendTelegramMessage(chatId, `❌ שגיאה ביצירת העמוד:\n${result.error}`);
            }
          } else if (text === "/status") {
            await sendTelegramMessage(
              chatId,
              `🟢 *סטטוס הסוכן:* דלוק ומחובר 24/7\nתשתית: GitHub Pages + Actions\nדומיין פעיל: ${
                process.env.NEXT_PUBLIC_SITE_URL || "alideals.co.il"
              }`
            );
          } else {
            await sendTelegramMessage(
              chatId,
              `👋 שלום! שלח לי כל קישור למוצר מעלי אקספרס ואני אייצר עליו סקירה מלאה, אינפוגרפיקה ואפרסם ישירות לדומיין שלך.`
            );
          }
        }
      }
    } catch (e) {
      // Network hiccup or timeout, wait 3 seconds and reconnect
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}
