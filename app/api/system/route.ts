import { NextResponse } from "next/server";
import { getSystemInfo } from "@/agent/system";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const info = await getSystemInfo();
    return NextResponse.json(info, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to collect system info", details: String(err) },
      { status: 500 }
    );
  }
}
