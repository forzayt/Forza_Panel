"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/common/app-shell";
import { Card, CardTitle } from "@/components/tailgrids/core/card";
import type { DatabaseRecord } from "@/agent/databases";

// Database detail stub — identity + folder info only. Tables, users, and
// live MySQL management arrive in a later phase.
export default function DatabaseDetailPage() {
  const params = useParams<{ name: string }>();
  const name = params.name ? decodeURIComponent(params.name) : "";
  const [database, setDatabase] = useState<DatabaseRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDatabase = useCallback(async () => {
    try {
      const res = await fetch(`/api/databases/mysql/${encodeURIComponent(name)}`, {
        cache: "no-store",
      });
      if (res.status === 404) {
        setError("not-found");
        return;
      }
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as { database: DatabaseRecord };
      setDatabase(json.database);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load database");
    }
  }, [name]);

  useEffect(() => {
    fetchDatabase();
  }, [fetchDatabase]);

  const details = database
    ? [
        { label: "Engine", value: database.engine },
        { label: "Folder", value: `data/databases/${database.engine}/${database.name}` },
        { label: "Created", value: new Date(database.createdAt).toLocaleString() },
      ]
    : [];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <Link
            href="/databases/mysql"
            className="text-sm font-medium text-text-tertiary hover:text-text-primary"
          >
            ← Databases
          </Link>
          <h1 className="mt-1 mb-1 flex items-center gap-3 text-[28px] leading-8 font-medium text-text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-base font-bold text-text-primary">
              {(database?.name ?? name).charAt(0).toUpperCase()}
            </span>
            <span className="font-mono-tech">{name}</span>
          </h1>
        </div>

        {error === "not-found" && (
          <Card className="text-center">
            <CardTitle>Database not found</CardTitle>
            <p className="mt-1 text-sm text-text-tertiary">
              No database named <span className="font-mono-tech">{name}</span> exists.
            </p>
            <Link
              href="/databases/mysql"
              className="mt-4 inline-block text-sm font-medium text-button-primary-outline-text hover:underline"
            >
              ← Back to Databases
            </Link>
          </Card>
        )}

        {error && error !== "not-found" && (
          <Card>
            <p className="text-sm text-button-error-outline-text">
              Could not load database: {error}
            </p>
          </Card>
        )}

        {database && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {details.map((d) => (
              <Card key={d.label}>
                <p className="text-[11px] text-text-tertiary">{d.label}</p>
                <p
                  className="mt-1 truncate font-mono-tech text-lg font-semibold text-text-primary"
                  title={d.value}
                >
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
