import { NextResponse } from "next/server";
import { requireAdmin } from "@/agent/auth";
import {
  describePrivilegeError,
  getPrivilegeStatus,
  lockPrivileges,
  unlockPrivileges,
} from "@/agent/privileges";

export const dynamic = "force-dynamic";

const noStore = { "Cache-Control": "no-store" } as const;

/** Current privilege state for the session (helper installed, unlocked, expiry). */
export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    return NextResponse.json(await getPrivilegeStatus(), { headers: noStore });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read privilege status", details: String(err) },
      { status: 500, headers: noStore }
    );
  }
}

/**
 * Verifies the sudo password and keeps it in process memory for 15 minutes.
 * The password never lands on disk and is never echoed back.
 */
export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const body = (await req.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";

  try {
    const { expiresAt } = await unlockPrivileges(password);
    return NextResponse.json(
      { ok: true, ...(await getPrivilegeStatus()), expiresAt },
      { headers: noStore }
    );
  } catch (err) {
    const privilege = describePrivilegeError(err);
    if (privilege) {
      return NextResponse.json(
        { error: privilege.error, code: privilege.code },
        { status: privilege.status, headers: noStore }
      );
    }
    return NextResponse.json(
      { error: "Could not verify the sudo password", details: String(err) },
      { status: 500, headers: noStore }
    );
  }
}

/** Forgets the stored password for this session. */
export async function DELETE() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    await lockPrivileges();
    return NextResponse.json(
      { ok: true, ...(await getPrivilegeStatus()) },
      { headers: noStore }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to lock privileges", details: String(err) },
      { status: 500, headers: noStore }
    );
  }
}
