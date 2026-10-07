import { NextResponse } from "next/server";
import { listTemplates } from "@/agent/templates";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const templates = await listTemplates();
    return NextResponse.json(
      { templates },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list templates", details: String(err) },
      { status: 500 }
    );
  }
}
