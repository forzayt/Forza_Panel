import { NextResponse } from "next/server";
import { listPorts } from "@/agent/ports";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const result = await listPorts();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list ports", details: String(err) },
      { status: 500 }
    );
  }
}
