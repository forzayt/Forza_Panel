import { NextResponse } from "next/server";
import { startServer } from "@/agent/servers";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const result = await startServer(decodeURIComponent(name));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, pid: result.pid });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to start server", details: String(err) },
      { status: 500 }
    );
  }
}
