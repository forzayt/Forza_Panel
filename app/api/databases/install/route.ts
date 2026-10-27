import { NextResponse } from "next/server";
import { installMysql } from "@/agent/mysql";
import { markDatabasesEngineInstalled } from "@/agent/databases";
import { getDatabaseTemplate } from "@/agent/templates";

import { requireAdmin } from "@/agent/auth";

export const dynamic = "force-dynamic";
// NOTE: apt install takes minutes — this route awaits completion like the
// template-import route does. Do not put a timeout in front of it.
export const maxDuration = 600;

const ENGINE = "mysql";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    // Optional templateId from the Import modal (template/database/*.json).
    // Today only "mysql" is supported — unknown ids are rejected so future
    // DB types plug in here without changing the client contract.
    let templateId: string | null = null;
    try {
      const body = (await req.json()) as { templateId?: unknown };
      if (typeof body.templateId === "string") templateId = body.templateId;
    } catch {
      // No JSON body — default to mysql for backwards compatibility.
    }
    if (templateId !== null) {
      const template = await getDatabaseTemplate(templateId);
      if (!template) {
        return NextResponse.json(
          { error: `Unknown database template "${templateId}".` },
          { status: 404 }
        );
      }
      if (template.engine !== ENGINE) {
        return NextResponse.json(
          { error: `"${template.label}" install is not supported yet.` },
          { status: 400 }
        );
      }
    }
    const result = await installMysql();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error, ...(result.code ? { code: result.code } : {}) },
        { status: result.status }
      );
    }
    // Flip stored records from "not installed" to the engine name.
    await markDatabasesEngineInstalled(ENGINE);
    return NextResponse.json({ ok: true, version: result.version });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to install MySQL", details: String(err) },
      { status: 500 }
    );
  }
}
