"use client";

import { useCallback, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import Topbar from "@/components/Topbar";
import UsageBar from "@/components/UsageBar";
import AreaChart from "@/components/AreaChart";
import MiniSpark from "@/components/MiniSpark";
import ServerHealth from "@/components/ServerHealth";
import ServicesTable from "@/components/ServicesTable";
import ActivityFeed from "@/components/ActivityFeed";
import StatusDot from "@/components/StatusDot";

interface SystemInfo {
  cpu: { usage: number; model: string; cores: number };
  memory: { used: number; total: number; usage: number };
  disk: { used: number; total: number; free: number; usage: number };
  system: { platform: string; hostname: string; architecture: string; uptime: number };
}

const HISTORY_LEN = 30;
const NET_BARS = [5, 8, 6, 10, 7, 12, 9, 13, 8, 11, 9, 14, 10, 12, 8, 11, 9, 13];

function formatUptime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatClock(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function pushHistory(prev: number[], v: number): number[] {
  const next = [...prev, v];
  return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next;
}

function StatCard({
  icon,
  iconBg,
  label,
  children,
  barValue,
  barTone,
  pct,
}: {
  icon: string;
  iconBg: string;
  label: string;
  children: React.ReactNode;
  barValue?: number;
  barTone?: "green" | "blue" | "amber" | "red" | "violet";
  pct?: string;
}) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#111832]/80 p-4">
      <div className="flex items-center gap-3">
        <span className={`flex h-9 w-9 items-center justify-center rounded-lg text-base ${iconBg}`}>
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-slate-400">{label}</p>
          <div className="font-mono-tech text-xl font-semibold text-white">{children}</div>
        </div>
      </div>
      {barValue !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <UsageBar value={barValue} tone={barTone} />
          </div>
          <span className="font-mono-tech text-[11px] text-slate-400">{pct}</span>
        </div>
      )}
    </section>
  );
}

function ChartPanel({
  icon,
  title,
  color,
  gradientId,
  data,
  xLabels,
}: {
  icon: string;
  title: string;
  color: string;
  gradientId: string;
  data: number[];
  xLabels: string[];
}) {
  return (
    <section className="rounded-xl border border-white/5 bg-[#111832]/80 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400">{icon}</span>
          <h2 className="text-[13px] font-semibold text-white">{title}</h2>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Live
          </span>
          <span className="rounded border border-white/10 px-1.5 py-0.5">1 minute ▾</span>
        </div>
      </div>
      <AreaChart data={data} color={color} id={gradientId} xLabels={xLabels} />
    </section>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<SystemInfo | null>(null);
  const [cpuHistory, setCpuHistory] = useState<number[]>([]);
  const [memHistory, setMemHistory] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchSystem = useCallback(async () => {
    try {
      const res = await fetch("/api/system", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json: SystemInfo = await res.json();
      setData(json);
      setCpuHistory((p) => pushHistory(p, json.cpu.usage));
      setMemHistory((p) => pushHistory(p, json.memory.usage));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch system info");
    }
  }, []);

  useEffect(() => {
    fetchSystem();
    const id = setInterval(fetchSystem, 2000);
    return () => clearInterval(id);
  }, [fetchSystem]);

  const cpu = data?.cpu.usage ?? 0;
  const mem = data?.memory.usage ?? 0;
  const disk = data?.disk.usage ?? 0;

  const cpuTrend =
    cpuHistory.length > 5 ? cpu - cpuHistory[0] : 0;

  const now = Date.now();
  const xLabels = [10, 8, 6, 4, 2, 0].map((m) =>
    formatClock(new Date(now - m * 60 * 1000))
  );

  return (
    <div className="flex min-h-screen bg-[#0a0f1e] text-slate-200">
      <Sidebar uptime={data ? formatUptime(data.system.uptime) : "—"} online={!error} />

      <div className="min-w-0 flex-1">
        <Topbar />

        <main className="space-y-4 p-4 sm:p-6">
          {/* Title + server pill */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-white">Dashboard</h1>
              <p className="text-xs text-slate-500">Overview of your server and resources</p>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-white/5 bg-[#111832]/80 px-3 py-1.5 text-xs">
              <span className="flex items-center gap-1.5 text-slate-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4 text-slate-400">
                  <ellipse cx="12" cy="5" rx="8" ry="3" />
                  <path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5" />
                  <path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3" />
                </svg>
                Local Server
              </span>
              <span className="flex items-center gap-1.5 text-emerald-400">
                <StatusDot online={!error} /> Online <span className="text-slate-500">▾</span>
              </span>
              <span className="hidden h-4 w-px bg-white/10 sm:block" />
              <span className="hidden items-center gap-1.5 font-mono-tech text-slate-400 sm:flex">
                {data?.system.hostname ?? "…"}
                <button className="text-slate-500 hover:text-slate-300" aria-label="Copy">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3.5 w-3.5">
                    <rect x="9" y="9" width="12" height="12" rx="2" />
                    <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                  </svg>
                </button>
              </span>
            </div>
          </div>

          {error && !data && (
            <div className="rounded-xl border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-300">
              Could not reach <span className="font-mono-tech">/api/system</span>: {error}
            </div>
          )}

          {/* Stat cards */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon="⚙" iconBg="bg-blue-500/15 text-sky-400" label="CPU Usage" barValue={cpu} barTone="green" pct={`${cpu.toFixed(0)}%`}>
              {cpu.toFixed(0)}%{" "}
              <span className={`text-xs font-normal ${cpuTrend <= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {cpuTrend <= 0 ? "↓" : "↑"} {Math.abs(cpuTrend).toFixed(0)}%
              </span>
            </StatCard>
            <StatCard icon="▤" iconBg="bg-blue-500/15 text-sky-400" label="Memory" barValue={mem} barTone="blue" pct={`${mem.toFixed(0)}%`}>
              {data ? data.memory.used.toFixed(1) : "—"}
              <span className="text-sm font-normal text-slate-400"> / {data ? data.memory.total.toFixed(0) : "—"} GB</span>
            </StatCard>
            <StatCard icon="🖴" iconBg="bg-violet-500/15 text-violet-400" label="Disk Usage" barValue={disk} barTone="violet" pct={`${disk.toFixed(0)}%`}>
              {data ? data.disk.used.toFixed(0) : "—"}
              <span className="text-sm font-normal text-slate-400"> / {data ? data.disk.total.toFixed(0) : "—"} GB</span>
            </StatCard>
            <section className="rounded-xl border border-white/5 bg-[#111832]/80 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/15 text-base text-sky-400">📶</span>
                <div>
                  <p className="text-[11px] text-slate-400">Network</p>
                  <p className="font-mono-tech text-xl font-semibold text-white">
                    12.4 <span className="text-sm font-normal text-slate-400">MB/s</span>
                  </p>
                </div>
                <div className="ml-auto">
                  {/* UI-only placeholder until network metering is added */}
                  <MiniSpark data={NET_BARS} color="#4ade80" width={72} height={28} bars />
                </div>
              </div>
            </section>
          </div>

          {/* Main grid */}
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_290px]">
            <div className="min-w-0 space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartPanel icon="⚙" title="CPU Usage" color="#4ade80" gradientId="cpuGrad" data={cpuHistory} xLabels={xLabels} />
                <ChartPanel icon="▤" title="Memory Usage" color="#60a5fa" gradientId="memGrad" data={memHistory} xLabels={xLabels} />
              </div>

              {/* Info cards */}
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { icon: "⚙", label: "CPU", lines: [data?.cpu.model ?? "…", data ? `${data.cpu.cores} Logical processors` : "…", data?.system.architecture ?? "…"] },
                  { icon: "▤", label: "Memory", lines: [data ? `${data.memory.total.toFixed(0)} GB` : "…", `${mem.toFixed(0)}% Used`, data ? `${data.memory.used.toFixed(1)} GB / ${data.memory.total.toFixed(1)} GB` : "…"] },
                  { icon: "🖴", label: "Storage", lines: [data ? `${data.disk.total.toFixed(0)} GB` : "…", `${disk.toFixed(0)}% Used`, data ? `${data.disk.used.toFixed(0)} GB / ${data.disk.total.toFixed(0)} GB` : "…"] },
                  { icon: "🖥", label: "System", lines: [data ? `${data.system.platform} ${data.system.architecture}` : "…", data?.system.hostname ?? "…", data ? `Uptime: ${formatUptime(data.system.uptime)}` : "…"] },
                ].map((c) => (
                  <section key={c.label} className="rounded-xl border border-white/5 bg-[#111832]/80 p-4 text-xs">
                    <p className="mb-1.5 flex items-center gap-1.5 text-slate-400">
                      <span>{c.icon}</span> {c.label}
                    </p>
                    <p className="truncate font-medium text-slate-100" title={c.lines[0]}>{c.lines[0]}</p>
                    <p className="mt-1 truncate text-slate-400">{c.lines[1]}</p>
                    <p className="mt-0.5 truncate font-mono-tech text-[11px] text-slate-500">{c.lines[2]}</p>
                  </section>
                ))}
              </div>

              <ServicesTable />
            </div>

            <div className="space-y-4">
              <ServerHealth cpu={cpu} memory={mem} disk={disk} cpuHistory={cpuHistory} memHistory={memHistory} />
              <ActivityFeed />
            </div>
          </div>

          <p className="pt-1 text-center text-[11px] text-slate-600">
            CPU · Memory · Disk update live every 2 seconds from{" "}
            <span className="font-mono-tech">GET /api/system</span> — Network, Services &amp; Activity are UI previews for later phases
          </p>
        </main>
      </div>
    </div>
  );
}
