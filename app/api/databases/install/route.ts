import { NextResponse } from "next/server";
import { installMysql } from "@/agent/mysql";
import { markDatabasesEngineInstalled } from "@/agent/databases";
import { getDatabaseTemplate } from "@/agent/templates";
import { requireAdmin } from "@/agent/auth";
import { privilegePreflight } from "@/agent/privileges";
import { streamJob } from "@/agent/stream";

export const dynamic = "force-dynamic";
// NOTE: apt install takes minutes — this route streams the output for as long
// as the command runs. Do not put a timeout in front of it.
export const maxDuration = 600;

const ENGINE = "mysql";

export async function POST(req: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

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

  // Plain 403 before streaming so the UI can unlock root and replay.
  const preflight = await privilegePreflight();
  if (preflight) {
    return NextResponse.json(
      { error: preflight.error, ...(preflight.code ? { code: preflight.code } : {}) },
      { status: preflight.status }
    );
  }

  return streamJob(async (log) => {
    const result = await installMysql(log);
    if ("error" in result) {
      return { ok: false, error: result.error, code: result.code };
    }
    // Flip stored records from "not installed" to the engine name.
    await markDatabasesEngineInstalled(ENGINE);
    return { ok: true, data: { version: result.version } };
  });
}
