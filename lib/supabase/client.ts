import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { analyticsDb } from "@/lib/db/analytics-db";

export function getSupabaseConfig(): { url: string; anonKey: string; serviceRoleKey: string } {
  let url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  let serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  try {
    const settings = analyticsDb.getSettings();
    if (!url && settings.supabaseUrl) url = settings.supabaseUrl;
    if (!anonKey && settings.supabaseAnonKey) anonKey = settings.supabaseAnonKey;
    if (!serviceRoleKey && settings.supabaseServiceKey) serviceRoleKey = settings.supabaseServiceKey;
  } catch {}

  if (!serviceRoleKey) serviceRoleKey = anonKey;

  return { url, anonKey, serviceRoleKey };
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(
    url &&
    anonKey &&
    url.startsWith("http") &&
    !url.includes("placeholder")
  );
}

let clientInstance: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();

  if (!clientInstance) {
    clientInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return clientInstance;
}

export const supabase = isSupabaseConfigured()
  ? getSupabaseBrowserClient()
  : null;

