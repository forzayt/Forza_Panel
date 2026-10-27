import { NextResponse } from "next/server";
import {
  getLibraryDetail,
  getLibraryStatus,
  installLibrary,
  uninstallLibrary,
} from "@/agent/libraries";
import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";
// apt installs can take minutes; the route waits for completion like the
// database install route does.
export const maxDuration = 600;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const detail = await getLibraryDetail(decodeURIComponent(id));
    if (!detail) {
      return NextResponse.json({ error: "Unknown library." }, { status: 404 });
    }
    return NextResponse.json(detail, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load library", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const body = (await req.json().catch(() => null)) as { version?: unknown } | null;
    const version = typeof body?.version === "string" ? body.version : undefined;

    const result = await installLibrary(decodeURIComponent(id), version);
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status }
      );
    }

    const status = await getLibraryStatus(decodeURIComponent(id));
    return NextResponse.json({ ok: true, version: result.version, status });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to install library", details: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const result = await uninstallLibrary(decodeURIComponent(id));
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status }
      );
    }

    const status = await getLibraryStatus(decodeURIComponent(id));
    return NextResponse.json({ ok: true, status });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to uninstall library", details: String(err) },
      { status: 500 }
    );
  }
}
