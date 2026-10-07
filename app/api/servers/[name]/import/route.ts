import { NextResponse } from "next/server";
import { importTemplate } from "@/agent/servers";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const body = (await req.json().catch(() => null)) as {
      templateId?: unknown;
    } | null;
    const templateId = typeof body?.templateId === "string" ? body.templateId : "";
    const result = await importTemplate(decodeURIComponent(name), templateId);
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }
    return NextResponse.json({ ok: true, server: result.record });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to import template", details: String(err) },
      { status: 500 }
    );
  }
}
