import { safeReadJson, safeWriteJson } from "./storage-helper";
import { CadenceBudget } from "./types";

function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

function getWeekString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const oneJan = new Date(year, 0, 1);
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const week = Math.ceil((d.getDay() + 1 + numberOfDays) / 7);
  return `${year}-W${week}`;
}

export function loadCadenceBudget(): CadenceBudget {
  const today = getTodayString();
  const currentWeek = getWeekString();

  const defaultBudget: CadenceBudget = {
    date: today,
    week: currentWeek,
    dailyProductsCount: 0,
    dailyProductsTarget: 3,
    weeklyTop5Count: 0,
    weeklyTop5Target: 2,
    weeklyCategoriesCount: 0,
    weeklyCategoriesTarget: 1,
    geminiApiCallsToday: 0,
    geminiDailySafeLimit: 100, // Safe limit for Gemini Free Tier (cap is 1,500)
    dailyRevenueTargetUsd: 100.0,
    estimatedRevenueTodayUsd: 34.5,
  };

  const data = safeReadJson<CadenceBudget>("agent_cadence.json", defaultBudget);

  // Reset daily counters if date changed
  if (data.date !== today) {
    data.date = today;
    data.dailyProductsCount = 0;
    data.geminiApiCallsToday = 0;
  }

  // Reset weekly counters if week changed
  if (data.week !== currentWeek) {
    data.week = currentWeek;
    data.weeklyTop5Count = 0;
    data.weeklyCategoriesCount = 0;
  }

  data.dailyRevenueTargetUsd = 100.0;
  return data;
}

export function saveCadenceBudget(budget: CadenceBudget): void {
  safeWriteJson("agent_cadence.json", budget);
}

export function updateCadenceTargets(
  dailyProducts?: number,
  weeklyTop5?: number,
  weeklyCategories?: number
): CadenceBudget {
  const budget = loadCadenceBudget();
  if (dailyProducts !== undefined) budget.dailyProductsTarget = dailyProducts;
  if (weeklyTop5 !== undefined) budget.weeklyTop5Target = weeklyTop5;
  if (weeklyCategories !== undefined) budget.weeklyCategoriesTarget = weeklyCategories;
  saveCadenceBudget(budget);
  return budget;
}

export function recordGeminiCall(): { allowed: boolean; callsToday: number } {
  const budget = loadCadenceBudget();
  budget.geminiApiCallsToday += 1;
  saveCadenceBudget(budget);

  const allowed = budget.geminiApiCallsToday <= budget.geminiDailySafeLimit;
  return { allowed, callsToday: budget.geminiApiCallsToday };
}

export function recordProductionItem(type: "product" | "top5" | "category"): CadenceBudget {
  const budget = loadCadenceBudget();
  if (type === "product") budget.dailyProductsCount += 1;
  if (type === "top5") budget.weeklyTop5Count += 1;
  if (type === "category") budget.weeklyCategoriesCount += 1;

  saveCadenceBudget(budget);
  return budget;
}
