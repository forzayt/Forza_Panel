import { NextResponse } from "next/server";
import { getLibrariesStatus } from "@/agent/libraries";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getLibrariesStatus();
    return NextResponse.json(status, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to detect installed stacks", details: String(err) },
      { status: 500 },
    );
  }
}
