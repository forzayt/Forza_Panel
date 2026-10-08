import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface PortEntry {
  proto: "TCP" | "UDP";
  address: string;
  port: number;
  pid: number | null;
  process: string | null;
  state: string;
}

export interface PortList {
  tcp: PortEntry[];
  udp: PortEntry[];
  total: number;
  platform: string;
}

const MAX_PORTS = 500;

export async function listPorts(): Promise<PortList> {
  const platform = os.platform();
  try {
    const entries =
      platform === "win32" ? await listWindowsPorts() : await listUnixPorts();
    const tcp = entries
      .filter((e) => e.proto === "TCP")
      .sort((a, b) => a.port - b.port || a.address.localeCompare(b.address))
      .slice(0, MAX_PORTS);
    const udp = entries
      .filter((e) => e.proto === "UDP")
      .sort((a, b) => a.port - b.port || a.address.localeCompare(b.address))
      .slice(0, MAX_PORTS);
    return { tcp, udp, total: entries.length, platform };
  } catch {
    return { tcp: [], udp: [], total: 0, platform };
  }
}

/** Windows: listening TCP connections + UDP endpoints, one script. */
async function listWindowsPorts(): Promise<PortEntry[]> {
  const script = [
    "$procs = @{}",
    "foreach ($p in (Get-Process -ErrorAction SilentlyContinue)) { $procs[$p.Id] = $p.ProcessName }",
    "$tcp = @(Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue) | ForEach-Object {",
    "  [pscustomobject]@{ proto = 'TCP'; address = $_.LocalAddress; port = [int]$_.LocalPort; pid = [int]$_.OwningProcess; process = $procs[[int]$_.OwningProcess]; state = $_.State.ToString().ToUpper() }",
    "}",
    "$udp = @(Get-NetUDPEndpoint -ErrorAction SilentlyContinue) | ForEach-Object {",
    "  [pscustomobject]@{ proto = 'UDP'; address = $_.LocalAddress; port = [int]$_.LocalPort; pid = [int]$_.OwningProcess; process = $procs[[int]$_.OwningProcess]; state = 'UNCONN' }",
    "}",
    "@($tcp; $udp) | ConvertTo-Json -Compress",
  ].join("\n");
  const { stdout } = await execFileAsync("powershell", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ]);
  const trimmed = stdout.trim();
  if (!trimmed || trimmed === "null") return [];
  const raw = (trimmed.startsWith("[") ? JSON.parse(trimmed) : [JSON.parse(trimmed)]) as Array<{
    proto?: unknown;
    address?: unknown;
    port?: unknown;
    pid?: unknown;
    process?: unknown;
    state?: unknown;
  }>;
  const entries: PortEntry[] = [];
  for (const r of raw) {
    if (r.proto !== "TCP" && r.proto !== "UDP") continue;
    if (typeof r.address !== "string" || !r.address) continue;
    if (typeof r.port !== "number" || !Number.isFinite(r.port)) continue;
    entries.push({
      proto: r.proto,
      address: r.address,
      port: Math.round(r.port),
      pid: typeof r.pid === "number" && r.pid > 0 ? Math.round(r.pid) : null,
      process: typeof r.process === "string" && r.process ? r.process : null,
      state: typeof r.state === "string" && r.state ? r.state : "UNKNOWN",
    });
  }
  return entries;
}

/** Linux / macOS: `ss` snapshots for TCP listen + UDP. */
async function listUnixPorts(): Promise<PortEntry[]> {
  const entries: PortEntry[] = [];
  try {
    const { stdout } = await execFileAsync("ss", ["-tlnp"]);
    entries.push(...parseSs(stdout, "TCP"));
  } catch {
    // `ss` missing — no TCP data.
  }
  try {
    const { stdout } = await execFileAsync("ss", ["-ulnp"]);
    entries.push(...parseSs(stdout, "UDP"));
  } catch {
    // No UDP data.
  }
  return entries;
}

function parseSs(output: string, proto: "TCP" | "UDP"): PortEntry[] {
  const entries: PortEntry[] = [];
  for (const line of output.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^Netid|^State/i.test(trimmed)) continue;
    const tokens = trimmed.split(/\s+/);
    // First addr:port-looking token is the local endpoint.
    const local = tokens.find((t) => /:[0-9*]+$/.test(t) || /:[0-9]+$/.test(t));
    if (!local) continue;
    const portMatch = local.match(/:(\d+)$/);
    if (!portMatch) continue;
    const address = local.slice(0, local.length - portMatch[0].length) || "*";
    const procMatch = trimmed.match(/"([^"]+)",pid=(\d+)/);
    entries.push({
      proto,
      address: address.replace(/^\[(.*)\]$/, "$1"),
      port: Number(portMatch[1]),
      pid: procMatch ? Number(procMatch[2]) : null,
      process: procMatch ? procMatch[1] : null,
      state: proto === "TCP" ? tokens[0].toUpperCase() : "UNCONN",
    });
  }
  return entries;
}
