import fs from "fs";
import path from "path";
import { aliExpressApi } from "../lib/aliexpress/api";
import { jsonDb } from "../lib/db";

// Load .env.local manually if running via ts-node
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...vals] = trimmed.split("=");
      if (key && vals.length > 0) {
        process.env[key.trim()] = vals.join("=").trim();
      }
    }
  });
}

async function main() {
  const query = process.argv[2] || "baby monitor";
  const maxPrice = parseFloat(process.argv[3] || "74.99");

  console.log("=======================================================");
  console.log(`🤖 סוכן איתור מוצרים אוטונומי - AliDeals`);
  console.log(`🔍 מילת חיפוש: "${query}" | סינון מכס: עד $${maxPrice}`);
  console.log("=======================================================\n");

  if (!aliExpressApi.isConfigured()) {
    console.error("❌ שגיאה: מפתחות AliExpress API (App Key / Secret) אינם מוגדרים.");
    process.exit(1);
  }

  const products = await aliExpressApi.searchProducts({
    keywords: query,
    maxPrice,
    sortBy: "LAST_VOLUME_DESC",
    pageSize: 10,
  });

  if (products.length === 0) {
    console.log("⚠️ לא נמצאו מוצרים תואמים או שה-API דורש הרשאות נוספות.");
    return;
  }

  console.log(`✅ נמצאו ${products.length} מוצרים מובילים באלי אקספרס:\n`);

  products.forEach((p, idx) => {
    console.log(`[#${idx + 1}] ${p.originalTitle?.substring(0, 75)}...`);
    console.log(`    💰 מחיר: $${p.priceUsd} (~₪${p.priceIls}) | ⭐ דירוג: ${p.rating} | 📦 הזמנות: ${p.ordersCount}`);
    console.log(`    🔗 קישור אפיליאייט: ${p.affiliateUrl || p.aliUrl}`);
    console.log(`    🖼️ תמונה: ${p.mainImage}\n`);
  });
}

main().catch(console.error);
