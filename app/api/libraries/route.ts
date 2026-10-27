import { NextResponse } from "next/server";
import { getLibrariesStatus } from "@/agent/libraries";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const status = await getLibrariesStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to detect installed stacks", details: String(err) },
      { status: 500 },
    );
  }
}
