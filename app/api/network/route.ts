import { NextResponse } from "next/server";
import { getNetworkInfo } from "@/agent/network";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const info = await getNetworkInfo();
    return NextResponse.json(info, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read network info", details: String(err) },
      { status: 500 }
    );
  }
}
