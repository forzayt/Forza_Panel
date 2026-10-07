"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/tailgrids/core/badge";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { toast } from "sonner";

interface PendingCommit {
  hash: string;
  message: string;
  author: string;
}

interface UpdateStatus {
  ok: boolean;
  upToDate?: boolean;
  branch?: string;
  local?: string;
  behind?: number;
  commits?: PendingCommit[];
  error?: string;
}

export default function UpdatePill() {
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/update", { cache: "no-store" });
      if (!res.ok) return;
      setStatus((await res.json()) as UpdateStatus);
    } catch {
      // Transient failure — keep last known state.
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const id = setInterval(fetchStatus, 30000);
    return () => clearInterval(id);
  }, [fetchStatus]);

  const handlePress = () => {
    if (!status?.ok) {
      toast.error(status?.error ?? "Update check unavailable.");
      return;
    }
    if (status.upToDate) {
      toast.info(`Already on the latest commit (${status.local}).`);
      return;
    }
    setIsOpen(true);
  };

  const handlePull = async () => {
    setIsPulling(true);
    try {
      const res = await fetch("/api/update", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
      } | null;
      if (!res.ok || !json?.ok) {
        toast.error(json?.error ?? `Update failed (${res.status}).`);
        return;
      }
      setIsOpen(false);
      toast.success("Updated — pulling latest code.");
      fetchStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setIsPulling(false);
    }
  };

  const behind = status?.ok ? (status.behind ?? 0) : 0;
  const hasUpdate = Boolean(status?.ok && !status.upToDate && behind > 0);

  return (
    <>
      <button
        onClick={handlePress}
        aria-label="Check for updates"
        title={
          !status
            ? "Checking for updates…"
            : !status.ok
              ? (status.error ?? "Update check unavailable")
              : status.upToDate
                ? `Up to date (${status.local})`
                : `${behind} new commit${behind === 1 ? "" : "s"} — click to review`
        }
        className="rounded-full outline-none transition-transform hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-button-primary-focus-ring"
      >
        <Badge
          color={!status || !status.ok ? "gray" : status.upToDate ? "success" : "warning"}
          size="sm"
          className={hasUpdate ? "animate-pulse" : undefined}
        >
          <span className="relative flex h-2 w-2">
            {hasUpdate && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            )}
            <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
          </span>
          {!status ? "Checking…" : hasUpdate ? `Update · ${behind}` : "Up to date"}
        </Badge>
      </button>

      <Dialog isOpen={isOpen} onOpenChange={setIsOpen} aria-label="Confirm update">
        <DialogHeader>
          <DialogTitle>Update available</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">
              <span className="font-mono-tech font-semibold">{behind}</span> new
              commit{behind === 1 ? "" : "s"} on{" "}
              <span className="font-mono-tech font-semibold">{status?.branch}</span>.
              Pulling runs <span className="font-mono-tech">git pull</span> on the
              panel folder.
            </p>
            <ul className="scrollbar-thin max-h-56 space-y-2 overflow-y-auto rounded-lg border border-card-border bg-background-gray-primary/40 p-3">
              {(status?.commits ?? []).map((c) => (
                <li key={c.hash} className="text-xs">
                  <span className="font-mono-tech font-semibold text-text-primary">
                    {c.hash}
                  </span>{" "}
                  <span className="text-text-secondary">{c.message}</span>
                  <span className="block pl-1 font-mono-tech text-[11px] text-text-tertiary">
                    by {c.author}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="primary" appearance="outline" onPress={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            appearance="fill"
            onPress={handlePull}
            isDisabled={isPulling}
          >
            {isPulling ? "Updating…" : "Update Now"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
