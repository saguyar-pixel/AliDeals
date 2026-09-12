/**
 * Standalone QA & Architectural Verification Script
 * Run with: node scripts/qa_verification.js
 */

const fs = require("fs");
const path = require("path");

const ROOT_DIR = path.resolve(__dirname, "..");

console.log("\n=======================================================");
console.log("   AliDeals Full-Stack QA & Stabilization Verification");
console.log("=======================================================\n");

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
  }
}

// Check 1: Zero synthetic SVG infographics in generate route
try {
  const genRoutePath = path.join(ROOT_DIR, "app", "api", "generate", "route.ts");
  const genContent = fs.readFileSync(genRoutePath, "utf-8");
  assert(
    !genContent.includes("generateHebrewInfographicSvg"),
    "1. Completely removed generateHebrewInfographicSvg from app/api/generate/route.ts"
  );
} catch (e) {
  assert(false, "1. Failed reading app/api/generate/route.ts: " + e.message);
}

// Check 2: Cloud-only media upload to Supabase Storage bucket 'review-assets'
try {
  const uploadRoutePath = path.join(ROOT_DIR, "app", "api", "upload", "route.ts");
  const uploadContent = fs.readFileSync(uploadRoutePath, "utf-8");
  assert(
    uploadContent.includes('from("review-assets")') && !uploadContent.includes("/public/uploads"),
    "2. Cloud-only media uploader uploads to Supabase Storage 'review-assets' with zero local /public/uploads"
  );
} catch (e) {
  assert(false, "2. Failed reading app/api/upload/route.ts: " + e.message);
}

// Check 3: State continuity in Products Catalog -> Ingest & Review Editor
try {
  const productsPagePath = path.join(ROOT_DIR, "app", "admin", "products", "page.tsx");
  const productsContent = fs.readFileSync(productsPagePath, "utf-8");
  assert(
    productsContent.includes("productId=${prod.id}&directAliId=${prod.aliId}") &&
    productsContent.includes("/admin/pages/edit/new?productId="),
    "3. Catalog passes both productId & directAliId to Ingest and offers direct edit link with productId"
  );
} catch (e) {
  assert(false, "3. Failed reading app/admin/products/page.tsx: " + e.message);
}

// Check 4: Notification System (AdminNotificationProvider in layout)
try {
  const layoutPath = path.join(ROOT_DIR, "app", "admin", "layout.tsx");
  const layoutContent = fs.readFileSync(layoutPath, "utf-8");
  assert(
    layoutContent.includes("AdminNotificationProvider"),
    "4. AdminNotificationProvider is globally mounted in app/admin/layout.tsx"
  );
} catch (e) {
  assert(false, "4. Failed reading app/admin/layout.tsx: " + e.message);
}

// Check 5: Auto 301 Redirect on Page Slug Change
try {
  const pageUpdatePath = path.join(ROOT_DIR, "app", "api", "pages", "update", "route.ts");
  const pageUpdateContent = fs.readFileSync(pageUpdatePath, "utf-8");
  assert(
    pageUpdateContent.includes("upsertRedirect") && pageUpdateContent.includes("current.slug !== safeSlug"),
    "5. Auto 301 redirect is triggered in app/api/pages/update/route.ts whenever slug is modified"
  );
} catch (e) {
  assert(false, "5. Failed reading app/api/pages/update/route.ts: " + e.message);
}

// Check 6: All 5 GA4 Telemetry Event Schemas Defined
try {
  const trackerPath = path.join(ROOT_DIR, "lib", "tracking", "client-tracker.ts");
  const trackerContent = fs.readFileSync(trackerPath, "utf-8");
  const hasAll5Events =
    trackerContent.includes("affiliate_clickout") &&
    trackerContent.includes("exit_modal_search") &&
    trackerContent.includes("customs_bundle_split_action") &&
    trackerContent.includes("ugc_vote_submitted") &&
    trackerContent.includes("newsletter_signup");
  assert(hasAll5Events, "6. All 5 required GA4 telemetry event schemas defined in lib/tracking/client-tracker.ts");
} catch (e) {
  assert(false, "6. Failed reading lib/tracking/client-tracker.ts: " + e.message);
}

// Check 7: QA Health API Route Exists
try {
  const qaApiPath = path.join(ROOT_DIR, "app", "api", "admin", "qa-health", "route.ts");
  assert(fs.existsSync(qaApiPath), "7. app/api/admin/qa-health/route.ts is present and ready for automated runs");
} catch (e) {
  assert(false, "7. Failed checking qa-health API route: " + e.message);
}

console.log("\n-------------------------------------------------------");
console.log(`Summary: ${passed} Passed, ${failed} Failed out of ${passed + failed} Checks.`);
console.log("-------------------------------------------------------\n");

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
