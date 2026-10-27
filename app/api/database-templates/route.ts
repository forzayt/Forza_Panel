import { NextResponse } from "next/server";
import { listDatabaseTemplates } from "@/agent/templates";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const templates = await listDatabaseTemplates();
    return NextResponse.json(
      { templates },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list database templates", details: String(err) },
      { status: 500 }
    );
  }
}
