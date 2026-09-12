import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfig, isSupabaseConfigured } from "./client";

let serverClientInstance: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client with admin capabilities (service_role)
 * to securely perform CMS mutations, background agent tasks, and bypass RLS.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { url, serviceRoleKey, anonKey } = getSupabaseConfig();
  // Prioritize serviceRoleKey for server-side admin operations (bypasses RLS)
  const activeKey = serviceRoleKey || anonKey;

  if (!url || !activeKey) {
    console.error("[Supabase Server Client] Missing Supabase URL or Key.");
    return null;
  }

  if (!serverClientInstance) {
    serverClientInstance = createClient(url, activeKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClientInstance;
}
