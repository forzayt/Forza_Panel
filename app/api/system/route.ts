import { NextResponse } from "next/server";
import { getSystemInfo } from "@/lib/system";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await getSystemInfo();
    return NextResponse.json(info, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to collect system info", details: String(err) },
      { status: 500 }
    );
  }
}
