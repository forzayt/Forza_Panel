import { NextResponse } from "next/server";
import { listPorts } from "@/agent/ports";

export const dynamic = "force-dynamic";

export async function GET() {
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
