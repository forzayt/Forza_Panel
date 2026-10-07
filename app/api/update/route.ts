import { NextResponse } from "next/server";
import { getUpdateStatus, pullUpdate } from "@/agent/update";

export const dynamic = "force-dynamic";

export async function GET() {
  const status = await getUpdateStatus();
  return NextResponse.json(status, { headers: { "Cache-Control": "no-store" } });
}

export async function POST() {
  const result = await pullUpdate();
  if ("error" in result) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 });
  }
  return NextResponse.json({ ok: true, output: result.output });
}
