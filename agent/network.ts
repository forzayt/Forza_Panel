import os from "node:os";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface InterfaceAddress {
  address: string;
  netmask: string;
  cidr: string | null;
}

export interface NetworkInterface {
  name: string;
  mac: string;
  /** true = up, false = down, null = unknown. */
  up: boolean | null;
  loopback: boolean;
  ipv4: InterfaceAddress[];
  ipv6: InterfaceAddress[];
  /** Cumulative bytes, null when the platform can't provide counters. */
  rxBytes: number | null;
  txBytes: number | null;
}

export interface NetworkInfo {
  hostname: string;
  lanIp: string;
  interfaces: NetworkInterface[];
}

export async function getNetworkInfo(): Promise<NetworkInfo> {
  const raw = os.networkInterfaces();
  const platform = os.platform();

  const counters = await getCounters(platform).catch(() => new Map<string, { rx: number; tx: number }>());
  const statuses = await getStatuses(platform, Object.keys(raw)).catch(() => new Map<string, boolean>());

  const interfaces: NetworkInterface[] = [];
  let lanIp = "127.0.0.1";
  let foundLan = false;

  for (const [name, addrs] of Object.entries(raw)) {
    if (!addrs || addrs.length === 0) continue;
    const ipv4: InterfaceAddress[] = [];
    const ipv6: InterfaceAddress[] = [];
    let mac = "00:00:00:00:00:00";
    let loopback = false;
    for (const a of addrs) {
      if (a.mac && a.mac !== "00:00:00:00:00:00") mac = a.mac;
      if (a.internal) loopback = true;
      const entry = { address: a.address, netmask: a.netmask, cidr: a.cidr ?? null };
      if (a.family === "IPv4") {
        ipv4.push(entry);
        if (!a.internal && !foundLan) {
          lanIp = a.address;
          foundLan = true;
        }
      } else if (a.family === "IPv6") {
        ipv6.push(entry);
      }
    }
    const counter = counters.get(name);
    const status = statuses.get(name);
    interfaces.push({
      name,
      mac,
      up: typeof status === "boolean" ? status : null,
      loopback,
      ipv4,
      ipv6,
      rxBytes: counter ? counter.rx : null,
      txBytes: counter ? counter.tx : null,
    });
  }

  // Interfaces with traffic first, then up, then the rest.
  interfaces.sort((a, b) => {
    const ta = (a.rxBytes ?? 0) + (a.txBytes ?? 0);
    const tb = (b.rxBytes ?? 0) + (b.txBytes ?? 0);
    if (tb !== ta) return tb - ta;
    if (a.loopback !== b.loopback) return a.loopback ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

  return { hostname: os.hostname(), lanIp, interfaces };
}

/** Cumulative rx/tx bytes keyed by interface name. */
async function getCounters(platform: string): Promise<Map<string, { rx: number; tx: number }>> {
  const out = new Map<string, { rx: number; tx: number }>();
  if (platform === "win32") {
    const script = [
      "$stats = Get-NetAdapterStatistics -ErrorAction SilentlyContinue",
      "@($stats) | ForEach-Object {",
      "  [pscustomobject]@{ name = $_.Name; rx = [double]$_.ReceivedBytes; tx = [double]$_.SentBytes }",
      "} | ConvertTo-Json -Compress",
    ].join("\n");
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      script,
    ]);
    const trimmed = stdout.trim();
    if (!trimmed) return out;
    const arr = (trimmed.startsWith("[") ? JSON.parse(trimmed) : [JSON.parse(trimmed)]) as Array<{
      name?: unknown;
      rx?: unknown;
      tx?: unknown;
    }>;
    for (const s of arr) {
      if (typeof s.name !== "string") continue;
      if (typeof s.rx !== "number" || typeof s.tx !== "number") continue;
      out.set(s.name, { rx: Math.round(s.rx), tx: Math.round(s.tx) });
    }
    return out;
  }
  // Linux: /proc/net/dev — "<iface>: <rxBytes> ... <txBytes> ...".
  const raw = await fs.readFile("/proc/net/dev", "utf-8");
  for (const line of raw.split("\n")) {
    const m = line.match(/^\s*([^:]+):\s*(.+)$/);
    if (!m) continue;
    const fields = m[2].trim().split(/\s+/).map(Number);
    if (fields.length < 9 || !fields.every(Number.isFinite)) continue;
    out.set(m[1].trim(), { rx: Math.round(fields[0]), tx: Math.round(fields[8]) });
  }
  return out;
}

/** Operative status keyed by interface name (best-effort). */
async function getStatuses(platform: string, names: string[]): Promise<Map<string, boolean>> {
  const out = new Map<string, boolean>();
  if (platform === "win32") {
    const script = [
      "@(Get-NetAdapter -ErrorAction SilentlyContinue) | ForEach-Object {",
      "  [pscustomobject]@{ name = $_.Name; up = ($_.Status -eq 'Up') }",
      "} | ConvertTo-Json -Compress",
    ].join("\n");
    const { stdout } = await execFileAsync("powershell", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      script,
    ]);
    const trimmed = stdout.trim();
    if (!trimmed) return out;
    const arr = (trimmed.startsWith("[") ? JSON.parse(trimmed) : [JSON.parse(trimmed)]) as Array<{
      name?: unknown;
      up?: unknown;
    }>;
    for (const s of arr) {
      if (typeof s.name === "string" && typeof s.up === "boolean") out.set(s.name, s.up);
    }
    return out;
  }
  if (platform === "linux") {
    // One `ip` call for all interfaces: "2: eth0: <...> ... state UP ...".
    try {
      const { stdout } = await execFileAsync("ip", ["-o", "link", "show"]);
      for (const line of stdout.split("\n")) {
        const m = line.match(/^\d+:\s+([^:@]+)[@:].*\bstate\s+(\w+)/);
        if (m) out.set(m[1], m[2] === "UP");
      }
      if (out.size > 0) return out;
    } catch {
      // Fall through to per-interface sysfs reads.
    }
    await Promise.all(
      names.map(async (n) => {
        try {
          const state = (await fs.readFile(`/sys/class/net/${n}/operstate`, "utf-8")).trim();
          out.set(n, state === "up");
        } catch {
          // Leave unknown.
        }
      })
    );
  }
  return out;
}
