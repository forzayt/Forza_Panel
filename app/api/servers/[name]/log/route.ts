import { NextResponse } from "next/server";
import { readServerLog } from "@/agent/servers";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const url = new URL(_req.url);
    const maxLines = Math.min(
      1000,
      Math.max(10, Number(url.searchParams.get("lines")) || 200)
    );
    const log = await readServerLog(decodeURIComponent(name), maxLines);
    if (log === null) {
      return NextResponse.json({ error: "Server not found." }, { status: 404 });
    }
    return NextResponse.json(
      { log },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to read log", details: String(err) },
      { status: 500 }
    );
  }
}
