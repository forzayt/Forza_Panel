import { NextResponse } from "next/server";
import { getLocalIp } from "@/agent/system";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Public IP via ipify; fall back to LAN IP when offline.
    try {
      const res = await fetch("https://api.ipify.org", { cache: "no-store" });
      if (res.ok) {
        const ip = (await res.text()).trim();
        if (ip) {
          return NextResponse.json(
            { ip },
            { headers: { "Cache-Control": "no-store" } }
          );
        }
      }
    } catch {
      // Ignore and fall through to LAN IP.
    }
    return NextResponse.json(
      { ip: getLocalIp() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to determine IP address", details: String(err) },
      { status: 500 }
    );
  }
}
