"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardTitle } from "@/components/tailgrids/core/card";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import type { ServerRecord } from "@/agent/servers";

function formatDateTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString();
}

export default function ServerDetailPage() {
  const params = useParams<{ name: string }>();
  const name = params.name ? decodeURIComponent(params.name) : "";
  const [server, setServer] = useState<ServerRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchServer = useCallback(async () => {
    try {
      const res = await fetch(`/api/servers/${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setError("not-found");
        return;
      }
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as { server: ServerRecord };
      setServer(json.server);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load server");
    }
  }, [name]);

  useEffect(() => {
    fetchServer();
  }, [fetchServer]);

  const details = server
    ? [
        { label: "Status", value: server.status },
        { label: "Type", value: server.type },
        { label: "Created", value: formatDateTime(server.createdAt) },
        { label: "Folder", value: `data/${server.name}` },
      ]
    : [];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <Link
            href="/servers"
            className="text-sm font-medium text-text-tertiary hover:text-text-primary"
          >
            ← Servers
          </Link>
          <h1 className="mt-1 mb-1 flex items-center gap-3 text-[28px] leading-8 font-medium text-text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-base font-bold text-text-primary">
              {(server?.name ?? name).charAt(0).toUpperCase()}
            </span>
            <span className="font-mono-tech">{name}</span>
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            {server ? (
              <>
                {server.type} ·{" "}
                <Badge
                  color={server.status === "running" ? "success" : "gray"}
                  size="sm"
                  className="capitalize"
                >
                  {server.status}
                </Badge>
              </>
            ) : (
              "Loading server…"
            )}
          </p>
        </div>

        {error === "not-found" && (
          <Card className="text-center">
            <CardTitle>Server not found</CardTitle>
            <p className="mt-1 text-sm text-text-tertiary">
              No server named <span className="font-mono-tech">{name}</span> exists.
            </p>
            <Link
              href="/servers"
              className="mt-4 inline-block text-sm font-medium text-button-primary-outline-text hover:underline"
            >
              ← Back to Servers
            </Link>
          </Card>
        )}

        {error && error !== "not-found" && (
          <Card>
            <p className="text-sm text-button-error-outline-text">
              Could not load server: {error}
            </p>
          </Card>
        )}

        {!error && !server && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
        )}

        {server && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {details.map((d) => (
              <Card key={d.label}>
                <p className="text-[11px] text-text-tertiary">{d.label}</p>
                <p className="mt-1 truncate font-mono-tech text-lg font-semibold text-text-primary capitalize" title={d.value}>
                  {d.value}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
