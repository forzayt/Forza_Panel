import { NextResponse } from "next/server";
import { getMysqlStatus } from "@/agent/mysql";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getMysqlStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to check MySQL status", details: String(err) },
      { status: 500 }
    );
  }
}
