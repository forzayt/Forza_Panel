"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import type { ServerRecord } from "@/agent/servers";

function formatDate(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusColor(status: ServerRecord["status"]) {
  if (status === "running") return "success" as const;
  if (status === "stopped") return "gray" as const;
  return "warning" as const;
}

export default function ServicesTable({ refreshKey = 0 }: { refreshKey?: number }) {
  const [servers, setServers] = useState<ServerRecord[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServers = useCallback(async () => {
    try {
      const res = await fetch("/api/servers", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as { servers: ServerRecord[] };
      setServers(json.servers);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load servers");
    }
  }, []);

  useEffect(() => {
    fetchServers();
  }, [fetchServers, refreshKey]);

  return (
    <div>
      <CardHeader className="mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">🧊</span>
          <CardTitle>Servers</CardTitle>
        </div>
      </CardHeader>

      {error && (
        <Card className="flex items-center justify-between gap-3">
          <p className="text-sm text-button-error-outline-text">
            Could not load servers: {error}
          </p>
          <Button variant="primary" appearance="outline" size="xs" onPress={fetchServers}>
            Retry
          </Button>
        </Card>
      )}

      {!error && servers === null && (
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      )}

      {!error && servers !== null && servers.length === 0 && (
        <Card className="text-center">
          <CardTitle>No servers yet</CardTitle>
          <p className="mt-1 text-sm text-text-tertiary">
            Click “Add Server” to create your first server folder.
          </p>
        </Card>
      )}

      {!error && servers !== null && servers.length > 0 && (
        <div className="space-y-4">
          {servers.map((s) => (
            <Link
              key={s.name}
              href={`/servers/${encodeURIComponent(s.name)}`}
              className="block transition-transform hover:-translate-y-0.5"
            >
              <Card className="flex items-center gap-5 transition-colors hover:border-button-primary-outline-stroke sm:gap-8">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-sm font-bold text-text-primary">
                  {s.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="truncate font-mono-tech text-sm font-medium text-text-primary">
                    {s.name}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">{s.type}</p>
                </div>
                <Badge color={statusColor(s.status)} size="sm" className="hidden shrink-0 capitalize sm:inline-flex">
                  {s.status}
                </Badge>
                <span className="hidden shrink-0 font-mono-tech text-[11px] text-text-tertiary md:block">
                  {formatDate(s.createdAt)}
                </span>
                <span className="shrink-0 text-text-tertiary">›</span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
