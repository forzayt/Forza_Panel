import { NextResponse } from "next/server";
import { killProcess } from "@/agent/processes";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ pid: string }> }
) {
  try {
    const { pid } = await params;
    const result = await killProcess(Number(pid));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to terminate process", details: String(err) },
      { status: 500 }
    );
  }
}
