import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface SystemInfo {
  cpu: {
    usage: number;
    model: string;
    cores: number;
  };
  memory: {
    used: number;
    total: number;
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    free: number;
    usage: number;
  };
  system: {
    platform: string;
    hostname: string;
    architecture: string;
    uptime: number;
  };
}

type CpuTimes = { idle: number; total: number };

function snapshotCpuTimes(): CpuTimes {
  const cpus = os.cpus();
  let idle = 0;
  let total = 0;
  for (const cpu of cpus) {
    idle += cpu.times.idle;
    total +=
      cpu.times.user + cpu.times.nice + cpu.times.sys + cpu.times.idle + cpu.times.irq;
  }
  return { idle, total };
}

function cpuUsageFromSnapshots(a: CpuTimes, b: CpuTimes): number {
  const idleDiff = b.idle - a.idle;
  const totalDiff = b.total - a.total;
  if (totalDiff <= 0) return 0;
  const usage = (1 - idleDiff / totalDiff) * 100;
  return Math.round(Math.min(100, Math.max(0, usage)) * 10) / 10;
}

/** Proper CPU utilization: sample per-core times ~120ms apart. */
export async function getCpuUsage(): Promise<number> {
  const a = snapshotCpuTimes();
  await new Promise((resolve) => setTimeout(resolve, 120));
  const b = snapshotCpuTimes();
  return cpuUsageFromSnapshots(a, b);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

const GB = 1024 ** 3;

export async function getDiskInfo(): Promise<{
  used: number;
  total: number;
  free: number;
  usage: number;
}> {
  const platform = os.platform();
  try {
    if (platform === "win32") {
      // Portable across modern Windows (wmic is removed on Win11+, so use PowerShell).
      // Query the system-drive volume.
      const sysDrive = process.env.SystemDrive || "C:";
      const driveLetter = sysDrive.replace(/[:\\\/]+$/, "");
      const ps = `Get-PSDrive -Name '${driveLetter}' | Select-Object -ExpandProperty Used; Get-PSDrive -Name '${driveLetter}' | Select-Object -ExpandProperty Free`;
      const { stdout } = await execFileAsync("powershell", [
        "-NoProfile",
        "-NonInteractive",
        "-Command",
        ps,
      ]);
      const lines = stdout
        .trim()
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);
      const usedBytes = Number(lines[0]);
      const freeBytes = Number(lines[1]);
      if (!Number.isFinite(usedBytes) || !Number.isFinite(freeBytes)) {
        throw new Error("Could not parse PowerShell disk output");
      }
      const totalBytes = usedBytes + freeBytes;
      return {
        used: round1(usedBytes / GB),
        total: round1(totalBytes / GB),
        free: round1(freeBytes / GB),
        usage:
          totalBytes > 0
            ? round1((usedBytes / totalBytes) * 100)
            : 0,
      };
    }

    // Linux / macOS: df -k <cwd>, parse "1K-blocks Used Available Use%".
    const { stdout } = await execFileAsync("df", ["-k", process.cwd()]);
    const lines = stdout.trim().split("\n");
    const last = lines[lines.length - 1].trim().split(/\s+/);
    // df columns: Filesystem 1K-blocks Used Available Use% Mounted
    const totalKb = Number(last[1]);
    const usedKb = Number(last[2]);
    const freeKb = Number(last[3]);
    if (![totalKb, usedKb, freeKb].every(Number.isFinite)) {
      throw new Error("Could not parse df output");
    }
    const totalBytes = totalKb * 1024;
    const usedBytes = usedKb * 1024;
    const freeBytes = freeKb * 1024;
    return {
      used: round1(usedBytes / GB),
      total: round1(totalBytes / GB),
      free: round1(freeBytes / GB),
      usage:
        totalBytes > 0 ? round1((usedBytes / totalBytes) * 100) : 0,
    };
  } catch {
    // Safe fallback: never break the dashboard if disk probing fails.
    return { used: 0, total: 0, free: 0, usage: 0 };
  }
}

export function getLocalIp(): string {
  const nets = os.networkInterfaces();
  // Prefer the first non-internal IPv4 (LAN address).
  for (const addrs of Object.values(nets)) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4" && !a.internal) return a.address;
    }
  }
  // Fallback: any IPv4 (including loopback).
  for (const addrs of Object.values(nets)) {
    for (const a of addrs ?? []) {
      if (a.family === "IPv4") return a.address;
    }
  }
  return "127.0.0.1";
}

export async function getSystemInfo(): Promise<SystemInfo> {
  const cpus = os.cpus();
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  const [cpuUsage, disk] = await Promise.all([getCpuUsage(), getDiskInfo()]);

  return {
    cpu: {
      usage: cpuUsage,
      model: (cpus[0]?.model ?? "Unknown CPU").trim(),
      cores: cpus.length,
    },
    memory: {
      used: round1(usedMem / GB),
      total: round1(totalMem / GB),
      usage: totalMem > 0 ? round1((usedMem / totalMem) * 100) : 0,
    },
    disk,
    system: {
      platform: os.platform(),
      hostname: os.hostname(),
      architecture: os.arch(),
      uptime: Math.floor(os.uptime()),
    },
  };
}
