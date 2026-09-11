import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "./client";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

let serverClientInstance: SupabaseClient | null = null;

/**
 * Returns a server-side Supabase client with admin capabilities (service_role)
 * to securely perform CMS mutations, background agent tasks, and bypass RLS.
 */
export function getSupabaseServerClient(): SupabaseClient | null {
  if (!isSupabaseConfigured() || !serviceRoleKey) {
    return null;
  }

  if (!serverClientInstance) {
    serverClientInstance = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClientInstance;
}
