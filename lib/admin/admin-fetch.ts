/**
 * Standardized Admin Request Helpers
 * Ensures every CMS API call transmits the admin token from localStorage or defaults,
 * preventing 403 Forbidden errors across all browsers and environments.
 */

export function getAdminToken(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem("alideals_admin_token") || "alideals2025";
  }
  return "alideals2025";
}

export function getAdminHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const token = getAdminToken();
  return {
    "Content-Type": "application/json",
    "x-admin-token": token,
    ...extraHeaders,
  };
}

export async function adminFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const headers = getAdminHeaders(
    init?.headers ? (init.headers as Record<string, string>) : {}
  );

  return fetch(input, {
    ...init,
    headers,
  });
}
