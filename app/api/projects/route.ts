import { NextResponse } from "next/server";
import { createProject, listProjects } from "@/agent/projects";
import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const projects = await listProjects();
    return NextResponse.json(
      { projects },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to list projects", details: String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await req.json().catch(() => null)) as {
      name?: unknown;
      description?: unknown;
    } | null;
    const name = typeof body?.name === "string" ? body.name : "";
    const description = typeof body?.description === "string" ? body.description : "";
    const result = await createProject(name, description);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ project: result.record }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to create project", details: String(err) },
      { status: 500 }
    );
  }
}
