import { NextResponse } from "next/server";
import { deleteProject, getProject } from "@/agent/projects";
import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { name } = await params;
    const project = await getProject(decodeURIComponent(name));
    if (!project) {
      return NextResponse.json({ error: "Project not found." }, { status: 404 });
    }
    return NextResponse.json(
      { project },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to load project", details: String(err) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const { name } = await params;
    const result = await deleteProject(decodeURIComponent(name));
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete project", details: String(err) },
      { status: 500 }
    );
  }
}
