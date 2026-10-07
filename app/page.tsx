"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Progress } from "@/components/tailgrids/core/progress";
import AreaChart from "@/components/AreaChart";
import MiniSpark from "@/components/MiniSpark";
import ServicesTable from "@/components/ServicesTable";
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
  label,
  children,
  barValue,
  pct,
}: {
  icon: string;
  label: string;
  children: React.ReactNode;
  barValue?: number;
  pct?: string;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-base text-text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[11px] text-text-tertiary">{label}</p>
          <div className="font-mono-tech text-xl font-semibold text-text-primary">
            {children}
          </div>
        </div>
      </div>
      {barValue !== undefined && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1">
            <Progress progress={Math.round(barValue)} />
          </div>
          <span className="font-mono-tech text-[11px] text-text-tertiary">{pct}</span>
        </div>
      )}
    </Card>
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
    <Card>
      <CardHeader className="mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">{icon}</span>
          <CardTitle>{title}</CardTitle>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-text-tertiary">
          <Badge color="success" size="sm">
            Live
          </Badge>
          <span className="rounded border border-card-border px-1.5 py-0.5">1 minute ▾</span>
        </div>
      </CardHeader>
      <AreaChart data={data} color={color} id={gradientId} xLabels={xLabels} />
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<SystemInfo | null>(null);
  const [ip, setIp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
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

  useEffect(() => {
    // IP rarely changes — fetch once on mount.
    fetch("/api/ip", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.ip) setIp(json.ip);
      })
      .catch(() => {});
  }, []);

  const cpu = data?.cpu.usage ?? 0;
  const mem = data?.memory.usage ?? 0;
  const disk = data?.disk.usage ?? 0;

  const copyIp = async () => {
    if (!ip) return;
    try {
      await navigator.clipboard.writeText(ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  const cpuTrend = cpuHistory.length > 5 ? cpu - cpuHistory[0] : 0;

  const now = Date.now();
  const xLabels = [10, 8, 6, 4, 2, 0].map((m) =>
    formatClock(new Date(now - m * 60 * 1000))
  );

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        {/* Title + server pill */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Dashboard
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Overview of your server and resources
              {data && (
                <> — uptime {formatUptime(data.system.uptime)}</>
              )}
            </p>
          </div>
          <Card className="flex items-center gap-3 px-3 py-1.5 text-xs">
            <Badge color={error ? "error" : "success"} size="sm">
              <StatusDot online={!error} />
              {error ? "Offline" : "Online"}
            </Badge>
            <span className="hidden h-4 w-px bg-border-primary sm:block" />
            <span className="hidden items-center gap-1.5 font-mono-tech text-text-tertiary sm:flex">
              {ip ?? "…"}
              {ip && (
                <button
                  onClick={copyIp}
                  aria-label="Copy IP address"
                  title={copied ? "Copied!" : "Copy IP address"}
                  className="rounded p-0.5 text-text-tertiary transition-colors hover:text-text-primary"
                >
                  {copied ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-green-600">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3 w-3">
                      <rect x="9" y="9" width="12" height="12" rx="2" />
                      <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                  )}
                </button>
              )}
            </span>
          </Card>
        </div>

        {error && !data && (
          <Card className="border-button-error-outline-stroke bg-button-error-outline-background px-4 py-3 text-sm text-button-error-outline-text">
            Could not reach <span className="font-mono-tech">/api/system</span>: {error}
          </Card>
        )}

        {/* Stat cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard icon="⚙" label="CPU Usage" barValue={cpu} pct={`${cpu.toFixed(0)}%`}>
            {cpu.toFixed(0)}%{" "}
            <span
              className={`text-xs font-normal ${cpuTrend <= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {cpuTrend <= 0 ? "↓" : "↑"} {Math.abs(cpuTrend).toFixed(0)}%
            </span>
          </StatCard>
          <StatCard icon="▤" label="Memory" barValue={mem} pct={`${mem.toFixed(0)}%`}>
            {data ? data.memory.used.toFixed(1) : "—"}
            <span className="text-sm font-normal text-text-tertiary">
              {" "}
              / {data ? data.memory.total.toFixed(0) : "—"} GB
            </span>
          </StatCard>
          <StatCard icon="🖴" label="Disk Usage" barValue={disk} pct={`${disk.toFixed(0)}%`}>
            {data ? data.disk.used.toFixed(0) : "—"}
            <span className="text-sm font-normal text-text-tertiary">
              {" "}
              / {data ? data.disk.total.toFixed(0) : "—"} GB
            </span>
          </StatCard>
          <Card>
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-base text-text-primary">
                📶
              </span>
              <div>
                <p className="text-[11px] text-text-tertiary">Network</p>
                <p className="font-mono-tech text-xl font-semibold text-text-primary">
                  12.4 <span className="text-sm font-normal text-text-tertiary">MB/s</span>
                </p>
              </div>
              <div className="ml-auto">
                {/* UI-only placeholder until network metering is added */}
                <MiniSpark data={NET_BARS} color="#4ade80" width={72} height={28} bars />
              </div>
            </div>
          </Card>
        </div>

        {/* Main content */}
        <div className="min-w-0 space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <ChartPanel
                icon="⚙"
                title="CPU Usage"
                color="#4ade80"
                gradientId="cpuGrad"
                data={cpuHistory}
                xLabels={xLabels}
              />
              <ChartPanel
                icon="▤"
                title="Memory Usage"
                color="#60a5fa"
                gradientId="memGrad"
                data={memHistory}
                xLabels={xLabels}
              />
            </div>

            {/* Info cards */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  icon: "⚙",
                  label: "CPU",
                  lines: [
                    data?.cpu.model ?? "…",
                    data ? `${data.cpu.cores} Logical processors` : "…",
                    data?.system.architecture ?? "…",
                  ],
                },
                {
                  icon: "▤",
                  label: "Memory",
                  lines: [
                    data ? `${data.memory.total.toFixed(0)} GB` : "…",
                    `${mem.toFixed(0)}% Used`,
                    data
                      ? `${data.memory.used.toFixed(1)} GB / ${data.memory.total.toFixed(1)} GB`
                      : "…",
                  ],
                },
                {
                  icon: "🖴",
                  label: "Storage",
                  lines: [
                    data ? `${data.disk.total.toFixed(0)} GB` : "…",
                    `${disk.toFixed(0)}% Used`,
                    data
                      ? `${data.disk.used.toFixed(0)} GB / ${data.disk.total.toFixed(0)} GB`
                      : "…",
                  ],
                },
                {
                  icon: "🖥",
                  label: "System",
                  lines: [
                    data ? `${data.system.platform} ${data.system.architecture}` : "…",
                    data?.system.hostname ?? "…",
                    data ? `Uptime: ${formatUptime(data.system.uptime)}` : "…",
                  ],
                },
              ].map((c) => (
                <Card key={c.label} className="text-xs">
                  <p className="mb-1.5 flex items-center gap-1.5 text-text-tertiary">
                    <span>{c.icon}</span> {c.label}
                  </p>
                  <p className="truncate font-medium text-text-primary" title={c.lines[0]}>
                    {c.lines[0]}
                  </p>
                  <p className="mt-1 truncate text-text-secondary">{c.lines[1]}</p>
                  <p className="mt-0.5 truncate font-mono-tech text-[11px] text-text-tertiary">
                    {c.lines[2]}
                  </p>
                </Card>
              ))}
            </div>

            <ServicesTable />
        </div>
      </div>
    </AppShell>
  );
}
