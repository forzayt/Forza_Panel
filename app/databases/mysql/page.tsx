"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AppShell from "@/components/common/app-shell";
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
import { Label } from "@/components/tailgrids/core/label";
import { toast } from "sonner";
import type { DatabaseRecord } from "@/agent/databases";

// Folder-backed databases for now: creating one makes
// data/databases/mysql/<name>/ (same layout as servers). A live MySQL
// connection — and with it real listing/creation — arrives in a later phase.
export default function MysqlPage() {
  const [databases, setDatabases] = useState<DatabaseRecord[] | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dbName, setDbName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const fetchDatabases = useCallback(async () => {
    try {
      const res = await fetch("/api/databases/mysql", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { databases: DatabaseRecord[] };
      setDatabases(json.databases);
    } catch {
      // List stays empty — non-fatal.
    }
  }, []);

  useEffect(() => {
    fetchDatabases();
  }, [fetchDatabases]);

  const openCreate = () => {
    setDbName("");
    setIsCreateOpen(true);
  };

  const handleCreate = async () => {
    const clean = dbName.trim();
    if (!clean) return;
    setIsCreating(true);
    try {
      const res = await fetch("/api/databases/mysql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(json?.error ?? `Failed to create database (${res.status}).`);
        return;
      }
      toast.success(`Database "${clean}" created.`);
      setIsCreateOpen(false);
      fetchDatabases();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create database.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <Link
            href="/databases"
            className="text-sm font-medium text-text-tertiary hover:text-text-primary"
          >
            ← Databases
          </Link>
          <h1 className="mt-1 mb-1 flex items-center gap-3 text-[28px] leading-8 font-medium text-text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-base font-bold text-text-primary">
              M
            </span>
            <span className="font-mono-tech">mysql</span>
          </h1>
        </div>

        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Databases</h2>
            <Button
              variant="primary"
              appearance="fill"
              onPress={openCreate}
              className="bg-orange-500 text-white hover:bg-orange-400"
            >
              <span aria-hidden="true" className="text-base leading-none">
                +
              </span>
              Create Database
            </Button>
          </div>
          <p className="px-5 py-8 text-center text-sm text-text-tertiary">
            {databases === null
              ? "Loading databases…"
              : databases.length === 0
                ? "No databases yet — create one to get started."
                : `${databases.length} database${databases.length === 1 ? "" : "s"}`}
          </p>
          {(databases ?? []).length > 0 && (
            <ul className="scrollbar-thin max-h-96 space-y-1 overflow-y-auto px-3 pb-3">
              {(databases ?? []).map((db) => (
                <li
                  key={db.name}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-background-gray-primary"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-sm font-bold text-text-primary">
                    {db.name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-mono-tech text-sm font-medium text-text-primary">
                      {db.name}
                    </span>
                    <span className="block truncate text-xs text-text-tertiary">
                      Created {new Date(db.createdAt).toLocaleString()}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Dialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        aria-label="Create database"
      >
        <DialogHeader>
          <DialogTitle>Create Database</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-1">
            <Label htmlFor="mysql-db-name">Database name</Label>
            <Input
              id="mysql-db-name"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              placeholder="my_database"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="w-full font-mono-tech"
            />
            <p className="text-xs text-text-tertiary">
              Letters, numbers, and underscores only — becomes a folder under{" "}
              <span className="font-mono-tech">data/databases/mysql/</span>.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={() => setIsCreateOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            appearance="fill"
            onPress={handleCreate}
            isDisabled={!dbName.trim() || isCreating}
            className="bg-orange-500 text-white hover:bg-orange-400"
          >
            {isCreating ? "Creating…" : "Create"}
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
