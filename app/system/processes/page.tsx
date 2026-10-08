"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import { Progress } from "@/components/tailgrids/core/progress";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/tailgrids/core/table";
import type { ProcessEntry, ProcessList } from "@/agent/processes";
import { toast } from "sonner";

type SortKey = "cpu" | "memMB" | "name" | "pid";

function formatMem(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${Math.round(mb)} MB`;
}

function cpuBar(cpu: number): string {
  if (cpu >= 80) return "#f87171";
  if (cpu >= 50) return "#fbbf24";
  return "#34d399";
}

function SortButton({
  label,
  sortKey,
  active,
  dir,
  onSort,
  className,
}: {
  label: string;
  sortKey: SortKey;
  active: SortKey;
  dir: 1 | -1;
  onSort: (k: SortKey) => void;
  className?: string;
}) {
  return (
    <button
      onClick={() => onSort(sortKey)}
      className={`inline-flex items-center gap-1 uppercase hover:text-text-primary ${className ?? ""}`}
    >
      {label}
      <span className="text-[10px] text-text-tertiary">
        {active === sortKey ? (dir === 1 ? "▲" : "▼") : "△"}
      </span>
    </button>
  );
}

export default function ProcessesPage() {
  const [data, setData] = useState<ProcessList | null>(null);
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cpu");
  const [sortDir, setSortDir] = useState<1 | -1>(-1);
  const [error, setError] = useState<string | null>(null);
  const [killTarget, setKillTarget] = useState<ProcessEntry | null>(null);
  const [isKilling, setIsKilling] = useState(false);

  const fetchProcesses = useCallback(async () => {
    try {
      const res = await fetch("/api/processes", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      setData(await res.json());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load processes");
    }
  }, []);

  useEffect(() => {
    fetchProcesses();
    // Collection itself takes ~1-3s (perf-counter sampling) — poll every 4s.
    const id = setInterval(fetchProcesses, 4000);
    return () => clearInterval(id);
  }, [fetchProcesses]);

  const onSort = (k: SortKey) => {
    if (k === sortKey) {
      setSortDir((d) => (d === 1 ? -1 : 1));
    } else {
      setSortKey(k);
      setSortDir(k === "name" ? 1 : -1);
    }
  };

  const handleKill = async () => {
    if (!killTarget) return;
    setIsKilling(true);
    try {
      const res = await fetch(`/api/processes/${killTarget.pid}/kill`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        toast.error(json?.error ?? `Failed to end task (${res.status}).`);
        return;
      }
      toast.success(`Ended ${killTarget.name} (${killTarget.pid}).`);
      setKillTarget(null);
      fetchProcesses();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to end task.");
    } finally {
      setIsKilling(false);
    }
  };

  const rows = useMemo(() => {
    const list = data?.processes ?? [];
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter(
          (p) => p.name.toLowerCase().includes(q) || String(p.pid).includes(q)
        )
      : [...list];
    filtered.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === "string" ? av.localeCompare(bv as string) : av - (bv as number);
      return cmp * sortDir;
    });
    return filtered;
  }, [data, query, sortKey, sortDir]);

  const top = data?.processes?.[0];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Processes
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Live processes on this machine
              {typeof data?.total === "number" && (
                <>
                  {" "}— {data.total} running
                  {top && (
                    <>
                      {" "}· top: <span className="font-mono-tech">{top.name}</span>
                    </>
                  )}
                </>
              )}
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

        <div className="max-w-md">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search processes…"
            aria-label="Search processes"
            className="w-full"
          />
        </div>

        {error && !data && (
          <Card className="border-button-error-outline-stroke bg-button-error-outline-background px-4 py-3 text-sm text-button-error-outline-text">
            Could not reach <span className="font-mono-tech">/api/processes</span>: {error}
          </Card>
        )}

        {!data && !error && (
          <div className="space-y-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        )}

        {data && (
          <Card className="p-0">
            <TableRoot fullBleed>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton label="Process" sortKey="name" active={sortKey} dir={sortDir} onSort={onSort} />
                  </TableHead>
                  <TableHead className="text-right">
                    <SortButton label="PID" sortKey="pid" active={sortKey} dir={sortDir} onSort={onSort} className="flex-row-reverse" />
                  </TableHead>
                  <TableHead>
                    <SortButton label="CPU" sortKey="cpu" active={sortKey} dir={sortDir} onSort={onSort} />
                  </TableHead>
                  <TableHead>
                    <SortButton label="Memory" sortKey="memMB" active={sortKey} dir={sortDir} onSort={onSort} />
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((p) => (
                  <TableRow key={p.pid} className="hover:bg-background-gray-primary/40">
                    <TableCell>
                      <span className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-xs font-bold text-text-primary">
                          {p.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-mono-tech text-[13px] text-text-primary">
                            {p.name}
                          </span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-mono-tech text-xs text-text-tertiary">
                      {p.pid}
                    </TableCell>
                    <TableCell>
                      <span className="flex min-w-36 items-center gap-2">
                        <span className="w-24 shrink-0">
                          <Progress progress={Math.round(p.cpu)} barColor={cpuBar(p.cpu)} />
                        </span>
                        <span className="font-mono-tech text-xs text-text-secondary">
                          {p.cpu.toFixed(1)}%
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex min-w-36 items-center gap-2">
                        <span className="w-24 shrink-0">
                          <Progress progress={Math.round(Math.min(100, p.memPct))} barColor="#60a5fa" />
                        </span>
                        <span className="font-mono-tech text-xs text-text-secondary">
                          {formatMem(p.memMB)}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="danger"
                        appearance="outline"
                        onPress={() => setKillTarget(p)}
                      >
                        End task
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-8 text-center text-sm text-text-tertiary">
                      No processes match “{query}”.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </TableRoot>
          </Card>
        )}

        <p className="text-center text-[11px] text-text-tertiary">
          Top {data?.processes.length ?? "—"} processes by CPU · refreshes every 4 seconds from{" "}
          <span className="font-mono-tech">GET /api/processes</span>
        </p>
      </div>

      <Dialog
        isOpen={killTarget !== null}
        onOpenChange={(open) => {
          if (!open) setKillTarget(null);
        }}
        aria-label="Confirm end task"
      >
        <DialogHeader>
          <DialogTitle>End task?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              Terminate{" "}
              <span className="font-mono-tech font-semibold text-text-primary">
                {killTarget?.name}
              </span>{" "}
              <span className="font-mono-tech text-text-tertiary">
                (PID {killTarget?.pid})
              </span>
              ?
            </p>
            <p className="rounded-lg border border-button-error-outline-stroke bg-button-error-outline-background px-3 py-2 text-sm text-button-error-outline-text">
              Unsaved data will be lost. Ending system processes can make the
              machine unstable or force a restart.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={() => setKillTarget(null)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            appearance="fill"
            onPress={handleKill}
            isDisabled={isKilling}
          >
            {isKilling ? "Ending…" : "End Task"}
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
