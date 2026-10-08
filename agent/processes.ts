import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface ProcessEntry {
  pid: number;
  name: string;
  /** CPU % normalized to total machine capacity (0-100 scale). */
  cpu: number;
  memMB: number;
  /** Memory % of total RAM. */
  memPct: number;
}

export interface ProcessList {
  processes: ProcessEntry[];
  /** Total running processes (before the top-N cut). */
  total: number;
  cores: number;
  platform: string;
}

const MAX_PROCESSES = 60;

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Normalize a raw %CPU reading (which can exceed 100 on multi-core) to 0-100. */
function normalizeCpu(raw: number, cores: number): number {
  if (!Number.isFinite(raw) || raw < 0) return 0;
  return round1(Math.min(100, raw / Math.max(1, cores)));
}

export async function listProcesses(limit = MAX_PROCESSES): Promise<ProcessList> {
  const cores = os.cpus().length || 1;
  const platform = os.platform();
  try {
    const processes =
      platform === "win32"
        ? await listWindowsProcesses(cores)
        : await listUnixProcesses(cores);
    processes.sort((a, b) => b.cpu - a.cpu || b.memMB - a.memMB);
    return {
      processes: processes.slice(0, limit),
      total: processes.length,
      cores,
      platform,
    };
  } catch {
    return { processes: [], total: 0, cores, platform };
  }
}

/**
 * Windows: one PowerShell invocation. % Processor Time needs two samples
 * (SampleInterval 1s); ID Process joins the reading to a pid; Get-Process
 * supplies the name + working set in the same script.
 */
async function listWindowsProcesses(cores: number): Promise<ProcessEntry[]> {
  const script = [
    "$cores = [Environment]::ProcessorCount",
    "$samples = (Get-Counter '\\Process(*)\\% Processor Time','\\Process(*)\\ID Process' -SampleInterval 1 -MaxSamples 2 -ErrorAction Stop).CounterSamples",
    "$cpuByPid = @{}",
    "foreach ($g in ($samples | Group-Object InstanceName)) {",
    "  if ($g.Name -eq '_Total' -or $g.Name -eq 'Idle') { continue }",
    "  $pct = ($g.Group | Where-Object { $_.Path -like '*% Processor Time' } | Select-Object -Last 1).CookedValue",
    "  $id = ($g.Group | Where-Object { $_.Path -like '*ID Process' } | Select-Object -Last 1).CookedValue",
    "  if ($null -ne $pct -and $null -ne $id) { $cpuByPid[[int]$id] = [double]$pct }",
    "}",
    "$memById = @{}",
    "foreach ($p in (Get-Process -ErrorAction SilentlyContinue)) { $memById[$p.Id] = @{ name = $p.ProcessName; mem = [double]$p.WorkingSet64 } }",
    "$out = @()",
    "foreach ($id in $cpuByPid.Keys) {",
    "  if (-not $memById.ContainsKey($id)) { continue }",
    "  $out += [pscustomobject]@{ pid = $id; name = $memById[$id].name; cpu = [math]::Round($cpuByPid[$id], 1); memBytes = $memById[$id].mem }",
    "}",
    "@{ cores = $cores; total = @(Get-Process).Count; processes = $out } | ConvertTo-Json -Compress -Depth 4",
  ].join("\n");

  const { stdout } = await execFileAsync("powershell", [
    "-NoProfile",
    "-NonInteractive",
    "-Command",
    script,
  ]);
  const parsed = JSON.parse(stdout) as {
    cores?: number;
    total?: number;
    processes?: { pid?: unknown; name?: unknown; cpu?: unknown; memBytes?: unknown } | Array<{ pid?: unknown; name?: unknown; cpu?: unknown; memBytes?: unknown }>;
  };
  const raw = Array.isArray(parsed.processes)
    ? parsed.processes
    : parsed.processes
      ? [parsed.processes]
      : [];
  const totalMem = os.totalmem();
  const entries: ProcessEntry[] = [];
  for (const p of raw) {
    const pid = typeof p.pid === "number" ? Math.round(p.pid) : NaN;
    const name = typeof p.name === "string" ? p.name.replace(/#\d+$/, "") : "";
    const cpu = typeof p.cpu === "number" ? p.cpu : NaN;
    const memBytes = typeof p.memBytes === "number" ? p.memBytes : NaN;
    if (!Number.isFinite(pid) || !name || !Number.isFinite(cpu) || !Number.isFinite(memBytes)) {
      continue;
    }
    entries.push({
      pid,
      name,
      cpu: normalizeCpu(cpu, cores),
      memMB: round1(memBytes / 1024 ** 2),
      memPct: totalMem > 0 ? round1((memBytes / totalMem) * 100) : 0,
    });
  }
  return entries;
}

/** Linux / macOS: single `ps` snapshot, already sorted by CPU. */
async function listUnixProcesses(cores: number): Promise<ProcessEntry[]> {
  const { stdout } = await execFileAsync("ps", [
    "-eo",
    "pid=,comm=,pcpu=,pmem=,rss=",
    "--sort=-pcpu",
  ]);
  const totalMem = os.totalmem();
  const entries: ProcessEntry[] = [];
  for (const line of stdout.trim().split("\n")) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 5) continue;
    const pid = Number(parts[0]);
    const name = parts[1];
    const cpu = Number(parts[2]);
    const pmem = Number(parts[3]);
    const rssKb = Number(parts[4]);
    if (![pid, cpu, pmem, rssKb].every(Number.isFinite) || !name) continue;
    const memBytes = rssKb * 1024;
    entries.push({
      pid: Math.round(pid),
      name,
      cpu: normalizeCpu(cpu, cores),
      memMB: round1(memBytes / 1024 ** 2),
      memPct: Number.isFinite(pmem) ? round1(pmem) : totalMem > 0 ? round1((memBytes / totalMem) * 100) : 0,
    });
  }
  return entries;
}
