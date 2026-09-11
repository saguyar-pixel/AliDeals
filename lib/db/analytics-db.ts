import fs from "fs";
import path from "path";
import {
  OutboundClickRecord,
  S2SConversionRecord,
  GscQueryRecord,
  Ga4PageStatRecord,
  SiteSettingsRecord,
  AnalyticsStorageSchema,
} from "../analytics/types";
import { safeGitCommitAndPush } from "../security/safe-git";

const DATA_DIR = path.join(process.cwd(), "data");
const ANALYTICS_FILE = "analytics_data.json";

const defaultSchema: AnalyticsStorageSchema = {
  settings: {
    gaMeasurementId: process.env.NEXT_PUBLIC_GA_ID || "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://ali-deals.co.il",
    aliexpressDefaultTrackingId: "default",
    updatedAt: new Date().toISOString(),
  },
  clicks: [],
  conversions: [],
  gscQueries: [],
  ga4Stats: [],
  lastUpdated: new Date().toISOString(),
};

function ensureDirExists() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch {
      // ignore
    }
  }
}

function readStorage(): AnalyticsStorageSchema {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    const tmpPath = path.join("/tmp", ANALYTICS_FILE);
    if (fs.existsSync(tmpPath)) {
      try {
        const raw = fs.readFileSync(tmpPath, "utf8");
        return JSON.parse(raw) as AnalyticsStorageSchema;
      } catch (e) {
        console.warn(`Failed reading /tmp/${ANALYTICS_FILE}:`, e);
      }
    }
  }

  ensureDirExists();
  const filePath = path.join(DATA_DIR, ANALYTICS_FILE);
  if (!fs.existsSync(filePath)) {
    try {
      fs.writeFileSync(filePath, JSON.stringify(defaultSchema, null, 2), "utf8");
    } catch {
      // ignore
    }
    return defaultSchema;
  }

  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw) as AnalyticsStorageSchema;
    return {
      settings: { ...defaultSchema.settings, ...(parsed.settings || {}) },
      clicks: Array.isArray(parsed.clicks) ? parsed.clicks : [],
      conversions: Array.isArray(parsed.conversions) ? parsed.conversions : [],
      gscQueries: Array.isArray(parsed.gscQueries) ? parsed.gscQueries : [],
      ga4Stats: Array.isArray(parsed.ga4Stats) ? parsed.ga4Stats : [],
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    return defaultSchema;
  }
}

function writeStorage(data: AnalyticsStorageSchema): void {
  data.lastUpdated = new Date().toISOString();

  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    try {
      const tmpPath = path.join("/tmp", ANALYTICS_FILE);
      fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf8");
    } catch (e) {
      console.warn(`Failed writing /tmp/${ANALYTICS_FILE}:`, e);
    }
  }

  try {
    ensureDirExists();
    const filePath = path.join(DATA_DIR, ANALYTICS_FILE);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.warn(`Local write to ${ANALYTICS_FILE} failed:`, err);
  }
}

export const analyticsDb = {
  // Settings
  getSettings(): SiteSettingsRecord {
    const data = readStorage();
    // prioritize env var if set
    if (process.env.NEXT_PUBLIC_GA_ID && !data.settings.gaMeasurementId) {
      data.settings.gaMeasurementId = process.env.NEXT_PUBLIC_GA_ID;
    }
    return data.settings;
  },

  saveSettings(newSettings: Partial<SiteSettingsRecord>): SiteSettingsRecord {
    const data = readStorage();
    data.settings = {
      ...data.settings,
      ...newSettings,
      updatedAt: new Date().toISOString(),
    };
    writeStorage(data);
    safeGitCommitAndPush("CMS Analytics Settings Update").catch(() => {});
    return data.settings;
  },

  // Outbound Clicks Tracking (MAIN CONVERSION EVENT)
  recordClick(click: Omit<OutboundClickRecord, "id" | "timestamp">): OutboundClickRecord {
    const data = readStorage();
    const entry: OutboundClickRecord = {
      ...click,
      id: `clk_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    data.clicks.unshift(entry);
    // Keep last 1,000 clicks in local JSON
    if (data.clicks.length > 1000) {
      data.clicks = data.clicks.slice(0, 1000);
    }

    writeStorage(data);
    return entry;
  },

  getClicks(limit = 100): OutboundClickRecord[] {
    const data = readStorage();
    return data.clicks.slice(0, limit);
  },

  // S2S Conversions Tracking
  recordConversion(conversion: Omit<S2SConversionRecord, "id" | "timestamp">): S2SConversionRecord {
    const data = readStorage();
    const entry: S2SConversionRecord = {
      ...conversion,
      id: `s2s_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
    };

    data.conversions = data.conversions || [];
    data.conversions.unshift(entry);
    if (data.conversions.length > 1000) {
      data.conversions = data.conversions.slice(0, 1000);
    }

    writeStorage(data);
    return entry;
  },

  getConversions(limit = 100): S2SConversionRecord[] {
    const data = readStorage();
    return (data.conversions || []).slice(0, limit);
  },

  // Google Search Console Queries
  importGscQueries(queries: Array<Omit<GscQueryRecord, "id" | "importedAt">>): { count: number } {
    const data = readStorage();
    const now = new Date().toISOString();

    const newRecords: GscQueryRecord[] = queries.map((q, idx) => ({
      id: `gsc_${Date.now()}_${idx}`,
      query: String(q.query || "").trim(),
      page: q.page ? String(q.page).trim() : undefined,
      clicks: Number(q.clicks) || 0,
      impressions: Number(q.impressions) || 0,
      ctr: typeof q.ctr === "number" ? q.ctr : parseFloat(String(q.ctr || 0).replace("%", "")) || 0,
      position: typeof q.position === "number" ? q.position : parseFloat(String(q.position || 0)) || 0,
      date: q.date,
      importedAt: now,
    }));

    // Merge or replace existing queries
    const existingMap = new Map<string, GscQueryRecord>();
    data.gscQueries.forEach((q) => existingMap.set(q.query.toLowerCase(), q));
    newRecords.forEach((q) => existingMap.set(q.query.toLowerCase(), q));

    data.gscQueries = Array.from(existingMap.values()).sort((a, b) => b.impressions - a.impressions);
    writeStorage(data);
    safeGitCommitAndPush(`CMS GSC Queries Import: ${newRecords.length} items`).catch(() => {});

    return { count: newRecords.length };
  },

  getGscQueries(): GscQueryRecord[] {
    return readStorage().gscQueries;
  },

  // Google Analytics 4 Page Stats
  importGa4Stats(stats: Array<Omit<Ga4PageStatRecord, "id" | "importedAt">>): { count: number } {
    const data = readStorage();
    const now = new Date().toISOString();

    const newRecords: Ga4PageStatRecord[] = stats.map((s, idx) => ({
      id: `ga4_${Date.now()}_${idx}`,
      pagePath: String(s.pagePath || "").trim(),
      pageTitle: s.pageTitle ? String(s.pageTitle).trim() : undefined,
      views: Number(s.views) || 0,
      users: Number(s.users) || 0,
      avgEngagementTimeSec: Number(s.avgEngagementTimeSec) || 0,
      bounceRate: typeof s.bounceRate === "number" ? s.bounceRate : parseFloat(String(s.bounceRate || 0).replace("%", "")) || 0,
      date: s.date,
      importedAt: now,
    }));

    const existingMap = new Map<string, Ga4PageStatRecord>();
    data.ga4Stats.forEach((s) => existingMap.set(s.pagePath.toLowerCase(), s));
    newRecords.forEach((s) => existingMap.set(s.pagePath.toLowerCase(), s));

    data.ga4Stats = Array.from(existingMap.values()).sort((a, b) => b.views - a.views);
    writeStorage(data);
    safeGitCommitAndPush(`CMS GA4 Stats Import: ${newRecords.length} pages`).catch(() => {});

    return { count: newRecords.length };
  },

  getGa4Stats(): Ga4PageStatRecord[] {
    return readStorage().ga4Stats;
  },

  clearAnalytics(type: "all" | "clicks" | "gsc" | "ga4"): boolean {
    const data = readStorage();
    if (type === "all" || type === "clicks") data.clicks = [];
    if (type === "all" || type === "gsc") data.gscQueries = [];
    if (type === "all" || type === "ga4") data.ga4Stats = [];
    writeStorage(data);
    safeGitCommitAndPush(`CMS Analytics Reset: ${type}`).catch(() => {});
    return true;
  },
};
