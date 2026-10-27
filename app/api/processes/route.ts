import { NextResponse } from "next/server";
import { listProcesses } from "@/agent/processes";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const result = await listProcesses();
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list processes", details: String(err) },
      { status: 500 }
    );
  }
}
