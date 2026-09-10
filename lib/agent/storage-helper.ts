import fs from "fs";
import path from "path";

/**
 * Serverless-Resilient Storage Helper.
 * In cloud serverless (e.g. Vercel), the local filesystem is read-only except for /tmp.
 * This helper guarantees safe read/write with in-memory caching and /tmp fallback.
 */
const inMemoryCache = new Map<string, any>();

export function safeReadJson<T>(filename: string, defaultValue: T): T {
  // 1. Check in-memory cache first
  if (inMemoryCache.has(filename)) {
    return inMemoryCache.get(filename) as T;
  }

  // 2. Check /tmp (serverless writable disk)
  const tmpPath = path.join("/tmp", filename);
  if (fs.existsSync(tmpPath)) {
    try {
      const raw = fs.readFileSync(tmpPath, "utf8");
      const parsed = JSON.parse(raw) as T;
      inMemoryCache.set(filename, parsed);
      return parsed;
    } catch {
      // ignore
    }
  }

  // 3. Check bundled project data directory
  const projectPath = path.join(process.cwd(), "data", filename);
  if (fs.existsSync(projectPath)) {
    try {
      const raw = fs.readFileSync(projectPath, "utf8");
      const parsed = JSON.parse(raw) as T;
      inMemoryCache.set(filename, parsed);
      return parsed;
    } catch {
      // ignore
    }
  }

  // 4. Default fallback
  inMemoryCache.set(filename, defaultValue);
  return defaultValue;
}

export function safeWriteJson<T>(filename: string, data: T): void {
  // 1. Update in-memory cache
  inMemoryCache.set(filename, data);

  const jsonString = JSON.stringify(data, null, 2);

  // 2. Write to /tmp for serverless runtime persistence
  try {
    const tmpPath = path.join("/tmp", filename);
    fs.writeFileSync(tmpPath, jsonString, "utf8");
  } catch (e) {
    console.warn(`[StorageHelper] Write to /tmp/${filename} notice:`, e);
  }

  // 3. Try writing to local project data dir (works in local dev, ignored if read-only cloud)
  try {
    const projectDir = path.join(process.cwd(), "data");
    if (!fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }
    const projectPath = path.join(projectDir, filename);
    fs.writeFileSync(projectPath, jsonString, "utf8");
  } catch {
    // Expected on read-only serverless filesystem, safe to ignore
  }
}
