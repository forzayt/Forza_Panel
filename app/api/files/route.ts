import { NextResponse } from "next/server";
import { listDir } from "@/agent/files";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const { searchParams } = new URL(req.url);
  const result = await listDir(searchParams.get("path") ?? "");
  if (!result) {
    return NextResponse.json({ error: "Folder not found." }, { status: 404 });
  }
  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
