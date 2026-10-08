import { NextResponse } from "next/server";
import { deleteDatabase, getDatabase } from "@/agent/databases";

export const dynamic = "force-dynamic";

const ENGINE = "mysql";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const database = await getDatabase(ENGINE, decodeURIComponent(name));
    if (!database) {
      return NextResponse.json({ error: "Database not found." }, { status: 404 });
    }
    return NextResponse.json(
      { database },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load database", details: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const result = await deleteDatabase(ENGINE, decodeURIComponent(name));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete database", details: String(err) },
      { status: 500 }
    );
  }
}
