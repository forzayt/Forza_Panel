import { NextResponse } from "next/server";
import { listProcesses } from "@/agent/processes";

export const dynamic = "force-dynamic";

export async function GET() {
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
