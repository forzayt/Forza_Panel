import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  isAdminConfigured,
  readAdminConfig,
  sessionToken,
} from "@/agent/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await readAdminConfig();
  const configured = isAdminConfigured(config);

  let authenticated = false;
  if (configured) {
    const store = await cookies();
    authenticated = store.get(ADMIN_COOKIE)?.value === sessionToken(config);
  }

  return NextResponse.json(
    { configured, authenticated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
