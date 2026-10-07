import { NextResponse } from "next/server";
import { readPreview } from "@/agent/files";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const rel = searchParams.get("path") ?? "";
  if (!rel) {
    return NextResponse.json({ error: "File path required." }, { status: 400 });
  }
  const preview = await readPreview(rel);
  if (!preview) {
    return NextResponse.json({ error: "File not found." }, { status: 404 });
  }
  return NextResponse.json(preview, { headers: { "Cache-Control": "no-store" } });
}
