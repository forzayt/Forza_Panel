import { NextResponse } from "next/server";
import { getDatabase } from "@/agent/databases";

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
