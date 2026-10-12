import { NextResponse } from "next/server";
import { installMysql } from "@/agent/mysql";
import { markDatabasesEngineInstalled } from "@/agent/databases";

export const dynamic = "force-dynamic";
// NOTE: apt install takes minutes — this route awaits completion like the
// template-import route does. Do not put a timeout in front of it.
export const maxDuration = 600;

const ENGINE = "mysql";

export async function POST() {
  try {
    const result = await installMysql();
    if ("error" in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
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
