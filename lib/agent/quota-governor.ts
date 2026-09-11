import { getSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { safeReadJson, safeWriteJson } from "./storage-helper";

export type QuotaService = "gemini_pro" | "aliexpress_open_api";

export interface QuotaStatus {
  allowed: boolean;
  service: QuotaService;
  reason?: string;
  waitMs: number;
  currentRpm: number;
  maxRpm: number;
  utilizationPercent: number;
}

interface LocalMeterRecord {
  secondCount: number;
  secondTimestamp: number;
  minuteCount: number;
  minuteTimestamp: number;
  hourCount: number;
  hourTimestamp: number;
  dayCount: number;
  dayTimestamp: string;
  tokensToday: number;
  throttledUntil: number | null;
}

const LOCAL_STORAGE_FILE = "api_quota_local.json";

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getLocalMeter(service: QuotaService): LocalMeterRecord {
  const all = safeReadJson<Record<string, LocalMeterRecord>>(LOCAL_STORAGE_FILE, {});
  const now = Date.now();
  const today = getTodayStr();

  const record: LocalMeterRecord = all[service] || {
    secondCount: 0,
    secondTimestamp: Math.floor(now / 1000),
    minuteCount: 0,
    minuteTimestamp: Math.floor(now / 60000),
    hourCount: 0,
    hourTimestamp: Math.floor(now / 3600000),
    dayCount: 0,
    dayTimestamp: today,
    tokensToday: 0,
    throttledUntil: null,
  };

  // Reset windows
  const currentSec = Math.floor(now / 1000);
  const currentMin = Math.floor(now / 60000);
  const currentHr = Math.floor(now / 3600000);

  if (record.secondTimestamp !== currentSec) {
    record.secondCount = 0;
    record.secondTimestamp = currentSec;
  }
  if (record.minuteTimestamp !== currentMin) {
    record.minuteCount = 0;
    record.minuteTimestamp = currentMin;
  }
  if (record.hourTimestamp !== currentHr) {
    record.hourCount = 0;
    record.hourTimestamp = currentHr;
  }
  if (record.dayTimestamp !== today) {
    record.dayCount = 0;
    record.tokensToday = 0;
    record.dayTimestamp = today;
  }

  return record;
}

function saveLocalMeter(service: QuotaService, meter: LocalMeterRecord) {
  const all = safeReadJson<Record<string, LocalMeterRecord>>(LOCAL_STORAGE_FILE, {});
  all[service] = meter;
  safeWriteJson(LOCAL_STORAGE_FILE, all);
}

export const quotaGovernor = {
  /**
   * Checks if an API call is currently allowed under PRO tier limits.
   * If close to the RPM limit (e.g. >80%), waitMs will indicate required pacing delay.
   */
  async checkQuota(service: QuotaService = "gemini_pro"): Promise<QuotaStatus> {
    const maxLimits = service === "gemini_pro"
      ? { rps: 5, rpm: 60, rph: 3600, rpd: 50000 }
      : { rps: 10, rpm: 300, rph: 10000, rpd: 100000 };

    const now = Date.now();

    // Check Cloud Supabase first
    if (isSupabaseConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        try {
          const { data } = await client
            .from("api_quota_meter")
            .select("*")
            .eq("id", service)
            .maybeSingle();

          if (data) {
            // Check throttle lockout
            if (data.is_throttled && data.throttle_until) {
              const unlockAt = new Date(data.throttle_until).getTime();
              if (now < unlockAt) {
                return {
                  allowed: false,
                  service,
                  reason: "שירות API מושהה זמנית עקב הגנה מפני עומס",
                  waitMs: Math.max(1000, unlockAt - now),
                  currentRpm: data.count_minute || 0,
                  maxRpm: data.max_rpm || maxLimits.rpm,
                  utilizationPercent: 100,
                };
              }
            }

            // Window calculations
            const minuteWindow = new Date(data.current_window_minute || 0).getTime();
            const minutePassed = now - minuteWindow > 60000;
            const currentRpm = minutePassed ? 0 : (data.count_minute || 0);
            const utilization = Math.min(100, Math.round((currentRpm / (data.max_rpm || maxLimits.rpm)) * 100));

            // Pacing recommendation: if >80% RPM, recommend pacing delay
            let waitMs = 0;
            if (currentRpm >= (data.max_rpm || maxLimits.rpm)) {
              waitMs = Math.max(2000, 60000 - (now - minuteWindow));
              return {
                allowed: false,
                service,
                reason: "הגעת למכסת הקריאות לדקה (RPM). המשימה נדחית לפתיחת חלון חדש.",
                waitMs,
                currentRpm,
                maxRpm: data.max_rpm || maxLimits.rpm,
                utilizationPercent: 100,
              };
            } else if (utilization >= 80) {
              // Graduated pacing: add 2-3 seconds delay to avoid burst limits
              waitMs = 2500;
            }

            return {
              allowed: true,
              service,
              waitMs,
              currentRpm,
              maxRpm: data.max_rpm || maxLimits.rpm,
              utilizationPercent: utilization,
            };
          }
        } catch (e) {
          console.warn("Supabase quota check failed, using local meter:", e);
        }
      }
    }

    // Local in-memory / JSON fallback
    const local = getLocalMeter(service);
    if (local.throttledUntil && now < local.throttledUntil) {
      return {
        allowed: false,
        service,
        reason: "חסימת קצב מקומית",
        waitMs: local.throttledUntil - now,
        currentRpm: local.minuteCount,
        maxRpm: maxLimits.rpm,
        utilizationPercent: 100,
      };
    }

    if (local.minuteCount >= maxLimits.rpm) {
      const waitMs = Math.max(2000, 60000 - (now % 60000));
      return {
        allowed: false,
        service,
        reason: "הגעת למכסה לדקה (RPM)",
        waitMs,
        currentRpm: local.minuteCount,
        maxRpm: maxLimits.rpm,
        utilizationPercent: 100,
      };
    }

    const utilization = Math.min(100, Math.round((local.minuteCount / maxLimits.rpm) * 100));
    return {
      allowed: true,
      service,
      waitMs: utilization >= 80 ? 2000 : 0,
      currentRpm: local.minuteCount,
      maxRpm: maxLimits.rpm,
      utilizationPercent: utilization,
    };
  },

  /**
   * Records that an API call took place, updating the RPS, RPM, RPH, RPD counters.
   */
  async recordUsage(service: QuotaService = "gemini_pro", tokensUsed: number = 0): Promise<void> {
    const now = new Date();
    const nowMs = now.getTime();

    // 1. Update Local
    const local = getLocalMeter(service);
    local.secondCount += 1;
    local.minuteCount += 1;
    local.hourCount += 1;
    local.dayCount += 1;
    local.tokensToday += tokensUsed;
    saveLocalMeter(service, local);

    // 2. Update Supabase
    if (isSupabaseConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        try {
          const { data } = await client
            .from("api_quota_meter")
            .select("*")
            .eq("id", service)
            .maybeSingle();

          if (data) {
            const minuteWindow = new Date(data.current_window_minute || 0).getTime();
            const minuteReset = nowMs - minuteWindow > 60000;

            const hourWindow = new Date(data.current_window_hour || 0).getTime();
            const hourReset = nowMs - hourWindow > 3600000;

            const dayWindow = data.current_window_day || "";
            const todayStr = getTodayStr();
            const dayReset = dayWindow !== todayStr;

            await client
              .from("api_quota_meter")
              .update({
                count_second: (data.count_second || 0) + 1,
                current_window_minute: minuteReset ? now.toISOString() : data.current_window_minute,
                count_minute: minuteReset ? 1 : (data.count_minute || 0) + 1,
                current_window_hour: hourReset ? now.toISOString() : data.current_window_hour,
                count_hour: hourReset ? 1 : (data.count_hour || 0) + 1,
                current_window_day: dayReset ? todayStr : data.current_window_day,
                count_day: dayReset ? 1 : (data.count_day || 0) + 1,
                tokens_used_today: dayReset ? tokensUsed : (Number(data.tokens_used_today) || 0) + tokensUsed,
                last_request_at: now.toISOString(),
                is_throttled: false,
                throttle_until: null,
                updated_at: now.toISOString(),
              })
              .eq("id", service);
          }
        } catch (e) {
          console.warn("Supabase recordUsage failed:", e);
        }
      }
    }
  },

  /**
   * Pauses execution if required to smooth out requests (Pacing),
   * ensuring PRO tier quotas are never breached.
   */
  async waitIfPacingRequired(service: QuotaService = "gemini_pro"): Promise<void> {
    const status = await this.checkQuota(service);
    if (status.waitMs > 0) {
      const sleepTime = Math.min(status.waitMs, 10000);
      console.log(`[QuotaGovernor] Pacing active for ${service}: waiting ${sleepTime}ms (RPM: ${status.currentRpm}/${status.maxRpm})`);
      await new Promise((resolve) => setTimeout(resolve, sleepTime));
    }
  },

  /**
   * Applies temporary lock if an API returns 429 Too Many Requests.
   */
  async handleRateLimitHit(service: QuotaService = "gemini_pro", durationSeconds: number = 60): Promise<void> {
    const unlockAt = new Date(Date.now() + durationSeconds * 1000);
    console.warn(`[QuotaGovernor] Rate limit (429) hit on ${service}! Throttling for ${durationSeconds}s until ${unlockAt.toISOString()}`);

    const local = getLocalMeter(service);
    local.throttledUntil = unlockAt.getTime();
    saveLocalMeter(service, local);

    if (isSupabaseConfigured()) {
      const client = getSupabaseServerClient();
      if (client) {
        try {
          await client
            .from("api_quota_meter")
            .update({
              is_throttled: true,
              throttle_until: unlockAt.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", service);
        } catch {}
      }
    }
  },
};
