"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import type { NetworkInfo } from "@/agent/network";

function formatRate(bytesPerSec: number | null): string {
  if (bytesPerSec === null) return "—";
  if (bytesPerSec < 1024) return `${Math.round(bytesPerSec)} B/s`;
  if (bytesPerSec < 1024 ** 2) return `${(bytesPerSec / 1024).toFixed(1)} KB/s`;
  if (bytesPerSec < 1024 ** 3) return `${(bytesPerSec / 1024 ** 2).toFixed(1)} MB/s`;
  return `${(bytesPerSec / 1024 ** 3).toFixed(1)} GB/s`;
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Card>
      <p className="text-[11px] text-text-tertiary">{label}</p>
      <div className="mt-1 font-mono-tech text-xl font-semibold text-text-primary">
        {children}
      </div>
    </Card>
  );
}

export default function NetworkPage() {
  const [data, setData] = useState<NetworkInfo | null>(null);
  const [publicIp, setPublicIp] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const hasDataRef = useRef(false);
  // Previous cumulative counters per interface, for live rates.
  const prevRef = useRef<Map<string, { rx: number; tx: number; at: number }>>(new Map());
  const [rates, setRates] = useState<Map<string, { down: number; up: number }>>(new Map());

  const fetchNetwork = useCallback(async () => {
    try {
      const res = await fetch("/api/network", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as NetworkInfo;
      if (!json.interfaces || json.interfaces.length === 0) {
        if (!hasDataRef.current) setError("Network list came back empty.");
        return;
      }
      hasDataRef.current = true;
      const now = Date.now();
      const next = new Map<string, { down: number; up: number }>();
      for (const iface of json.interfaces) {
        const prev = prevRef.current.get(iface.name);
        if (
          prev &&
          typeof iface.rxBytes === "number" &&
          typeof iface.txBytes === "number" &&
          now > prev.at
        ) {
          const dt = (now - prev.at) / 1000;
          const down = iface.rxBytes >= prev.rx ? (iface.rxBytes - prev.rx) / dt : 0;
          const up = iface.txBytes >= prev.tx ? (iface.txBytes - prev.tx) / dt : 0;
          next.set(iface.name, { down, up });
        }
        if (typeof iface.rxBytes === "number" && typeof iface.txBytes === "number") {
          prevRef.current.set(iface.name, { rx: iface.rxBytes, tx: iface.txBytes, at: now });
        }
      }
      setRates(next);
      setData(json);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load network info");
    }
  }, []);

  useEffect(() => {
    fetchNetwork();
    // Sampling itself takes ~1-3s — poll every 4s.
    const id = setInterval(fetchNetwork, 4000);
    return () => clearInterval(id);
  }, [fetchNetwork]);

  useEffect(() => {
    // Public IP rarely changes — fetch once on mount.
    fetch("/api/ip", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.ip) setPublicIp(json.ip);
      })
      .catch(() => {});
  }, []);

  const copy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard unavailable — no-op.
    }
  };

  let totalDown = 0;
  let totalUp = 0;
  let rated = false;
  for (const r of rates.values()) {
    totalDown += r.down;
    totalUp += r.up;
    rated = true;
  }
  const upCount = data?.interfaces.filter((i) => i.up).length ?? 0;

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Network
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Interfaces and throughput on {data?.hostname ?? "this machine"}
            </p>
          </div>
          <Badge color={error ? "error" : "success"} size="sm">
            <span className="relative flex h-2 w-2">
              {!error && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
              )}
              <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
            </span>
            {error ? "Offline" : "Live"}
          </Badge>
        </div>

        {error && !data && (
          <Card className="border-button-error-outline-stroke bg-button-error-outline-background px-4 py-3 text-sm text-button-error-outline-text">
            Could not reach <span className="font-mono-tech">/api/network</span>: {error}
          </Card>
        )}

        {!data && !error && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Public IP">
                <span className="flex items-center gap-2 text-base">
                  <span className="truncate">{publicIp ?? "…"}</span>
                  {publicIp && (
                    <button
                      onClick={() => copy("public", publicIp)}
                      aria-label="Copy public IP"
                      className="shrink-0 rounded p-0.5 text-text-tertiary hover:text-text-primary"
                    >
                      <span className="text-xs">{copied === "public" ? "✓" : "⧉"}</span>
                    </button>
                  )}
                </span>
              </StatCard>
              <StatCard label="LAN IP">
                <span className="flex items-center gap-2 text-base">
                  <span className="truncate">{data.lanIp}</span>
                  <button
                    onClick={() => copy("lan", data.lanIp)}
                    aria-label="Copy LAN IP"
                    className="shrink-0 rounded p-0.5 text-text-tertiary hover:text-text-primary"
                  >
                    <span className="text-xs">{copied === "lan" ? "✓" : "⧉"}</span>
                  </button>
                </span>
              </StatCard>
              <StatCard label="Download">
                <span className="text-emerald-400">↓ {rated ? formatRate(totalDown) : "…"}</span>
              </StatCard>
              <StatCard label="Upload">
                <span className="text-sky-400">↑ {rated ? formatRate(totalUp) : "…"}</span>
              </StatCard>
            </div>

            <Card className="p-0">
              <TableRoot fullBleed>
                <TableHeader>
                  <TableRow>
                    <TableHead>Interface</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>IPv4</TableHead>
                    <TableHead>IPv6</TableHead>
                    <TableHead className="text-right">Down</TableHead>
                    <TableHead className="text-right">Up</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.interfaces.map((iface) => {
                    const rate = rates.get(iface.name);
                    return (
                      <TableRow key={iface.name} className="hover:bg-background-gray-primary/40">
                        <TableCell>
                          <span className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-xs font-bold text-text-primary">
                              {iface.name.charAt(0).toUpperCase()}
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[13px] font-medium text-text-primary">
                                {iface.name}
                              </span>
                              <span className="block truncate font-mono-tech text-[11px] text-text-tertiary">
                                {iface.mac}
                              </span>
                            </span>
                          </span>
                        </TableCell>
                        <TableCell>
                          {iface.loopback ? (
                            <Badge color="gray" size="sm">Loopback</Badge>
                          ) : iface.up === true ? (
                            <Badge color="success" size="sm">Up</Badge>
                          ) : iface.up === false ? (
                            <Badge color="gray" size="sm">Down</Badge>
                          ) : (
                            <Badge color="gray" size="sm">Unknown</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {iface.ipv4.length > 0 ? (
                            <span className="block space-y-0.5 font-mono-tech text-xs text-text-secondary">
                              {iface.ipv4.map((a) => (
                                <span key={a.address} className="block">
                                  {a.address}
                                  <span className="text-text-tertiary">/{a.cidr?.split("/")[1] ?? ""}</span>
                                </span>
                              ))}
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {iface.ipv6.length > 0 ? (
                            <span className="block font-mono-tech text-xs text-text-secondary">
                              <span className="block max-w-48 truncate" title={iface.ipv6.map((a) => a.address).join("\n")}>
                                {iface.ipv6[0].address}
                              </span>
                              {iface.ipv6.length > 1 && (
                                <span className="text-text-tertiary">+{iface.ipv6.length - 1} more</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-xs text-text-tertiary">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono-tech text-xs text-emerald-400">
                          {rate ? `↓ ${formatRate(rate.down)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right font-mono-tech text-xs text-sky-400">
                          {rate ? `↑ ${formatRate(rate.up)}` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </TableRoot>
            </Card>

            <p className="text-center text-[11px] text-text-tertiary">
              {data.interfaces.length} interfaces · {upCount} up · refreshes every 4
              seconds from <span className="font-mono-tech">GET /api/network</span>
            </p>
          </>
        )}
      </div>
    </AppShell>
  );
}
