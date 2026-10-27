import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  isAdminConfigured,
  readAdminConfig,
  sessionToken,
  writeAdminConfig,
} from "@/agent/admin";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 4;

export async function POST(request: Request) {
  const existing = await readAdminConfig();
  if (isAdminConfigured(existing)) {
    return NextResponse.json(
      { error: "An admin account already exists. Sign in instead." },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const stored = await writeAdminConfig({ username, password });

  const store = await cookies();
  store.set(ADMIN_COOKIE, sessionToken(stored), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true, configured: true });
}
