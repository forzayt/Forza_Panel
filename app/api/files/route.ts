import { NextResponse } from "next/server";
import { listDir } from "@/agent/files";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const result = await listDir(searchParams.get("path") ?? "");
  if (!result) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
