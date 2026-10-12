import { NextResponse } from "next/server";
import { createDatabase, listDatabases } from "@/agent/databases";

export const dynamic = "force-dynamic";

const ENGINE = "mysql";

export async function GET() {
  try {
    const result = await listDatabases(ENGINE);
    if (Array.isArray(result)) {
      return NextResponse.json(
        { databases: result },
        { headers: { "Cache-Control": "no-store" } }
      );
    }
    return NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list databases", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
    } | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const result = await createDatabase(ENGINE, name);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, database: result.record }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create database", details: String(err) },
      { status: 500 }
    );
  }
}
