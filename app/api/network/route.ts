import { NextResponse } from "next/server";
import { getNetworkInfo } from "@/agent/network";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const info = await getNetworkInfo();
    return NextResponse.json(info, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read network info", details: String(err) },
      { status: 500 }
    );
  }
}
