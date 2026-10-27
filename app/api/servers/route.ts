import { NextResponse } from "next/server";
import { createServer, listServers } from "@/agent/servers";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const servers = await listServers();
    return NextResponse.json(
      { servers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list servers", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json().catch(() => null)) as { name?: unknown } | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const result = await createServer(name);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ server: result.record }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create server", details: String(err) },
      { status: 500 }
    );
  }
}
