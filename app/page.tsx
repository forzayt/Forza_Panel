"use client";

import { useCallback, useEffect, useState } from "react";
import SystemCard from "@/components/SystemCard";
import UsageBar from "@/components/UsageBar";
import UsageChart from "@/components/UsageChart";
import StatusIndicator from "@/components/StatusIndicator";

interface SystemInfo {
  cpu: { usage: number; model: string; cores: number };
  memory: { used: number; total: number; usage: number };
  disk: { used: number; total: number; free: number; usage: number };
  system: { platform: string; hostname: string; architecture: string; uptime: number };
}

const HISTORY_LEN = 30;

function formatUptime(totalSeconds: number): string {
  const d = Math.floor(totalSeconds / 86400);
  const h = Math.floor((totalSeconds % 86400) / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function pushHistory(prev: number[], v: number): number[] {
  const next = [...prev, v];
  return next.length > HISTORY_LEN ? next.slice(next.length - HISTORY_LEN) : next;
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

  const loading = !data && !error;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/15 font-mono-tech text-lg font-bold text-emerald-400">
            F
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">ForzaPanel</h1>
            <p className="text-xs text-zinc-500">Local Server</p>
          </div>
        </div>
        <StatusIndicator online={!error} label={error ? "Offline" : "Online"} />
      </header>

      {error && !data && (
        <div className="mb-6 rounded-xl border border-red-900 bg-red-950/40 px-5 py-4 text-sm text-red-300">
          Could not reach <span className="font-mono-tech">/api/system</span>: {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-44 animate-pulse rounded-xl border border-zinc-800 bg-zinc-900/60"
            />
          ))}
        </div>
      ) : (
        data && (
          <>
            {/* Overview cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <SystemCard title="CPU">
                <p className="font-mono-tech text-3xl font-semibold text-emerald-400">
                  {data.cpu.usage.toFixed(1)}
                  <span className="text-base text-zinc-500">%</span>
                </p>
                <p className="mt-2 truncate text-xs text-zinc-400" title={data.cpu.model}>
                  {data.cpu.model}
                </p>
                <p className="font-mono-tech mt-1 text-xs text-zinc-500">
                  {data.cpu.cores} logical processors
                </p>
              </SystemCard>

              <SystemCard title="Memory">
                <p className="font-mono-tech text-3xl font-semibold text-sky-400">
                  {data.memory.usage.toFixed(1)}
                  <span className="text-base text-zinc-500">%</span>
                </p>
                <p className="font-mono-tech mt-2 text-xs text-zinc-400">
                  {data.memory.used.toFixed(1)} / {data.memory.total.toFixed(1)} GB
                </p>
                <div className="mt-3">
                  <UsageBar value={data.memory.usage} tone="blue" />
                </div>
              </SystemCard>

              <SystemCard title="Disk">
                <p className="font-mono-tech text-3xl font-semibold text-amber-400">
                  {data.disk.usage.toFixed(1)}
                  <span className="text-base text-zinc-500">%</span>
                </p>
                <p className="font-mono-tech mt-2 text-xs text-zinc-400">
                  {data.disk.used.toFixed(1)} / {data.disk.total.toFixed(1)} GB
                </p>
                <p className="font-mono-tech mt-1 text-xs text-zinc-500">
                  {data.disk.free.toFixed(1)} GB free
                </p>
                <div className="mt-3">
                  <UsageBar value={data.disk.usage} tone="amber" />
                </div>
              </SystemCard>

              <SystemCard title="System">
                <dl className="space-y-2 text-xs">
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">OS</dt>
                    <dd className="font-mono-tech text-zinc-200">{data.system.platform}</dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Hostname</dt>
                    <dd className="font-mono-tech truncate text-zinc-200">
                      {data.system.hostname}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Arch</dt>
                    <dd className="font-mono-tech text-zinc-200">
                      {data.system.architecture}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt className="text-zinc-500">Uptime</dt>
                    <dd className="font-mono-tech text-zinc-200">
                      {formatUptime(data.system.uptime)}
                    </dd>
                  </div>
                </dl>
              </SystemCard>
            </div>

            {/* Live monitoring */}
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
                  Live CPU Usage
                </h2>
                <UsageChart data={cpuHistory} label="CPU utilization" color="#34d399" />
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
                <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-zinc-400">
                  Live RAM Usage
                </h2>
                <UsageChart data={memHistory} label="Memory utilization" color="#38bdf8" />
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-zinc-600">
              Refreshing every 2 seconds from{" "}
              <span className="font-mono-tech">GET /api/system</span> · ForzaPanel Phase 1
            </p>
          </>
        )
      )}
    </div>
  );
}
