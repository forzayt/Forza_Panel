import { NextResponse } from "next/server";
import { listDatabaseTemplates } from "@/agent/templates";

export const dynamic = "force-dynamic";

export async function GET() {
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
