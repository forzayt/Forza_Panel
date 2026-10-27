import { NextResponse } from "next/server";
import { stopServer } from "@/agent/servers";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { name } = await params;
    const result = await stopServer(decodeURIComponent(name));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to stop server", details: String(err) },
      { status: 500 }
    );
  }
}
