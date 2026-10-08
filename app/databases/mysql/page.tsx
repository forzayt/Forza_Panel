"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
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
import { Label } from "@/components/tailgrids/core/label";
import InstallLoader from "@/components/InstallLoader";
import { toast } from "sonner";
import type { DatabaseRecord } from "@/agent/databases";
import type { MysqlStatus } from "@/agent/mysql";

// Folder-backed databases for now: creating one makes
// data/databases/mysql/<name>/ (same layout as servers). A live MySQL
// connection — and with it real listing/creation — arrives in a later phase.
export default function MysqlPage() {
  const [databases, setDatabases] = useState<DatabaseRecord[] | null>(null);
  const [mysql, setMysql] = useState<MysqlStatus | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
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

  const fetchMysqlStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/databases/mysql/status", { cache: "no-store" });
      if (!res.ok) return;
      setMysql((await res.json()) as MysqlStatus);
    } catch {
      // Status badge stays hidden — non-fatal.
    }
  }, []);

  useEffect(() => {
    fetchMysqlStatus();
  }, [fetchMysqlStatus]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const res = await fetch("/api/databases/mysql/install", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        version?: string | null;
      } | null;
      if (!res.ok) {
        toast.error(json?.error ?? `MySQL install failed (${res.status}).`);
        return;
      }
      toast.success(
        json?.version ? `MySQL ${json.version} installed.` : "MySQL installed."
      );
      fetchMysqlStatus();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "MySQL install failed.");
    } finally {
      setIsInstalling(false);
    }
  };

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

        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-text-primary">
            Databases
            {databases !== null && databases.length > 0 && (
              <span className="ml-2 font-mono-tech text-xs font-normal text-text-tertiary">
                {databases.length}
              </span>
            )}
          </h2>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            {mysql?.installed && (
              <Badge color="success" size="sm">
                MySQL{mysql.version ? ` ${mysql.version}` : ""} detected
              </Badge>
            )}
            {mysql && !mysql.installed && !isInstalling && (
              <Button
                variant="success"
                appearance="fill"
                onPress={handleInstall}
              >
                Install MySQL
              </Button>
            )}
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
        </div>

        {isInstalling && (
          <Card>
            <InstallLoader />
            <p className="pb-2 text-center text-sm text-text-tertiary">
              Installing MySQL Server via apt — this takes a few minutes. Keep
              this page open.
            </p>
          </Card>
        )}

        {databases === null && (
          <p className="text-sm text-text-tertiary">Loading databases…</p>
        )}

        {databases !== null && databases.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-text-tertiary">
              No databases yet — create one to get started.
            </p>
          </Card>
        )}

        {databases !== null && databases.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {databases.map((db) => (
              <Link
                key={db.name}
                href={`/databases/mysql/${encodeURIComponent(db.name)}`}
                className="block h-full"
              >
                <Card className="h-full transition-transform hover:-translate-y-0.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-base font-bold text-text-primary">
                      {db.name.charAt(0).toUpperCase()}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-mono-tech text-sm font-medium text-text-primary">
                        {db.name}
                      </p>
                      <p className="truncate text-xs text-text-tertiary">
                        Created {new Date(db.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-text-tertiary">›</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
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
