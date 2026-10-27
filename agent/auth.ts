import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ADMIN_COOKIE, isAdminConfigured, readAdminConfig, sessionToken } from "./admin";

/** True when admin.json is filled in and the request carries a valid session cookie. */
export async function isAuthenticated(): Promise<boolean> {
  const config = await readAdminConfig();
  if (!isAdminConfigured(config)) return false;

  const store = await cookies();
  return store.get(ADMIN_COOKIE)?.value === sessionToken(config);
}

/**
 * API guard: returns a 401 response when the caller is not an authenticated
 * admin, otherwise null so the handler can continue.
 *
 *   const unauthorized = await requireAdmin();
 *   if (unauthorized) return unauthorized;
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  if (await isAuthenticated()) return null;
  return NextResponse.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}
