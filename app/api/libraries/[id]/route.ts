import { NextResponse } from "next/server";
import {
  getLibraryDetail,
  getLibraryStatus,
  installLibrary,
  uninstallLibrary,
} from "@/agent/libraries";
import { requireAdmin } from "@/agent/auth";
import { privilegePreflight } from "@/agent/privileges";
import { streamJob } from "@/agent/stream";

export const dynamic = "force-dynamic";
// apt installs can take minutes; the route keeps streaming for as long as the
// command runs.
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

  // Answer with a plain 403 *before* streaming so the UI can ask for a sudo
  // password and replay the request.
  const preflight = await privilegePreflight();
  if (preflight) {
    return NextResponse.json(
      { error: preflight.error, ...(preflight.code ? { code: preflight.code } : {}) },
      { status: preflight.status }
    );
  }

  const { id } = await params;
  const body = (await req.json().catch(() => null)) as { version?: unknown } | null;
  const version = typeof body?.version === "string" ? body.version : undefined;
  const libraryId = decodeURIComponent(id);

  return streamJob(async (log) => {
    const result = await installLibrary(libraryId, version, log);
    if ("error" in result) {
      return { ok: false, error: result.error, code: result.code };
    }

    const status = await getLibraryStatus(libraryId);
    return { ok: true, data: { version: result.version, status } };
  });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const preflight = await privilegePreflight();
  if (preflight) {
    return NextResponse.json(
      { error: preflight.error, ...(preflight.code ? { code: preflight.code } : {}) },
      { status: preflight.status }
    );
  }

  const { id } = await params;
  const libraryId = decodeURIComponent(id);

  return streamJob(async (log) => {
    const result = await uninstallLibrary(libraryId, log);
    if ("error" in result) {
      return { ok: false, error: result.error, code: result.code };
    }

    const status = await getLibraryStatus(libraryId);
    return { ok: true, data: { status } };
  });
}
