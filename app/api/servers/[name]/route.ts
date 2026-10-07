import { NextResponse } from "next/server";
import { deleteServer, getServer, isValidServerName } from "@/agent/servers";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const result = await deleteServer(decodeURIComponent(name));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete server", details: String(err) },
      { status: 500 }
    );
  }
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decoded = decodeURIComponent(name);
    if (!isValidServerName(decoded)) {
      return NextResponse.json({ error: "Invalid server name." }, { status: 400 });
    }
    const server = await getServer(decoded);
    if (!server) {
      return NextResponse.json({ error: "Server not found." }, { status: 404 });
    }
    return NextResponse.json(
      { server },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load server", details: String(err) },
      { status: 500 }
    );
  }
}
