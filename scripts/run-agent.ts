import { startTelegramAgentListener } from "../lib/agent/telegram-listener";

console.log("=================================================");
console.log("🚀 AliDeals Autonomous Agent 24/7 Engine Started");
console.log("=================================================");
console.log("מאזין לפקודות, שליפת מוצרים וג'נרוט תוכן אוטומטי...");

// Start the 24/7 Telegram Listener
startTelegramAgentListener().catch((err) => {
  console.error("Fatal Agent Error:", err);
});
