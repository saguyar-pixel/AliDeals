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
  const activeKey = serviceRoleKey || anonKey;

  if (!url || !activeKey) {
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
