import { NextResponse } from "next/server";
import { getServer, isValidServerName } from "@/lib/servers";

export const dynamic = "force-dynamic";

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
