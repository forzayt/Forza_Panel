import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_COOKIE_MAX_AGE,
  credentialsMatch,
  isAdminConfigured,
  isHashedPassword,
  readAdminConfig,
  sessionToken,
  writeAdminConfig,
} from "@/agent/admin";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const config = await readAdminConfig();
  if (!isAdminConfigured(config)) {
    return NextResponse.json(
      {
        error: "No admin account is configured yet. Create one first.",
        configured: false,
      },
      { status: 409 },
    );
  }

  const body = (await request.json().catch(() => null)) as
    | { username?: unknown; password?: unknown }
    | null;
  const username = typeof body?.username === "string" ? body.username : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username.trim() || !password) {
    return NextResponse.json(
      { error: "Username and password are required." },
      { status: 400 },
    );
  }

  if (!(await credentialsMatch(config, username, password))) {
    return NextResponse.json(
      { error: "Invalid username or password." },
      { status: 401 },
    );
  }

  // Reuse the hash: a hand-written plaintext password is replaced with its
  // scrypt hash on the first successful sign-in.
  const stored = isHashedPassword(config.password)
    ? config
    : await writeAdminConfig(config);

  const store = await cookies();
  store.set(ADMIN_COOKIE, sessionToken(stored), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_COOKIE_MAX_AGE,
  });

  return NextResponse.json({ ok: true });
}
