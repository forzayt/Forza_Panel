"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/common/app-shell";
import { Button } from "@/components/tailgrids/core/button";
import { Card, CardTitle } from "@/components/tailgrids/core/card";
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

// Same shape as the server import flow: Install Database opens a searchable
// list, then a confirm step, then installs. Real engine binaries arrive via
// apt today; more options plug into INSTALL_OPTIONS later.
const INSTALL_OPTIONS = [
  { id: "mysql-apt", label: "MySQL Server", hint: "via apt · Linux only" },
];

// Database detail stub — identity + folder info only. Tables, users, and
// live MySQL management arrive in a later phase.
export default function DatabaseDetailPage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = params.name ? decodeURIComponent(params.name) : "";
  const [database, setDatabase] = useState<DatabaseRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [mysql, setMysql] = useState<MysqlStatus | null>(null);
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [installQuery, setInstallQuery] = useState("");
  const [isInstalling, setIsInstalling] = useState(false);

  const fetchDatabase = useCallback(async () => {
    try {
      const res = await fetch(`/api/databases/${encodeURIComponent(name)}`, {
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

  const fetchMysqlStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/databases/status", { cache: "no-store" });
      if (!res.ok) return;
      setMysql((await res.json()) as MysqlStatus);
    } catch {
      // Install button stays visible — non-fatal.
    }
  }, []);

  useEffect(() => {
    fetchMysqlStatus();
  }, [fetchMysqlStatus]);

  const openInstall = () => {
    setInstallQuery("");
    setIsInstalling(false);
    setIsInstallOpen(true);
  };

  const filteredOptions = INSTALL_OPTIONS.filter((o) => {
    const q = installQuery.trim().toLowerCase();
    if (!q) return true;
    return o.label.toLowerCase().includes(q) || o.hint.toLowerCase().includes(q);
  });

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const res = await fetch("/api/databases/install", { method: "POST" });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        version?: string | null;
      } | null;
      if (!res.ok) {
        toast.error(json?.error ?? `Install failed (${res.status}).`);
        setIsInstalling(false);
        return;
      }
      toast.success(
        json?.version ? `MySQL ${json.version} installed.` : "MySQL installed."
      );
      setIsInstallOpen(false);
      setIsInstalling(false);
      fetchMysqlStatus();
    } catch (e) {
      setIsInstalling(false);
      toast.error(e instanceof Error ? e.message : "Install failed.");
    }
  };

  const expectedConfirm = `delete ${name}`;

  const openDelete = () => {
    setConfirmText("");
    setDeleteError(null);
    setIsDeleteOpen(true);
  };

  const handleDelete = async () => {
    if (confirmText.trim() !== expectedConfirm) {
      setDeleteError(`Type "${expectedConfirm}" to confirm.`);
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/databases/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setDeleteError(json?.error ?? `Failed to delete database (${res.status}).`);
        return;
      }
      setIsDeleteOpen(false);
      router.push("/databases");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete database.");
    } finally {
      setIsDeleting(false);
    }
  };

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <Link
              href="/databases"
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
          {database && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {(!mysql || !mysql.installed) && (
                <Button variant="success" appearance="fill" size="md" onPress={openInstall}>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-4"
                  >
                    <path d="M12 3v12m0 0 4-4m-4 4-4-4" />
                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                  </svg>
                  Install Database
                </Button>
              )}
              <Button variant="danger" appearance="outline" size="md" onPress={openDelete}>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4"
                >
                  <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                </svg>
                Delete
              </Button>
            </div>
          )}
        </div>

        {error === "not-found" && (
          <Card className="text-center">
            <CardTitle>Database not found</CardTitle>
            <p className="mt-1 text-sm text-text-tertiary">
              No database named <span className="font-mono-tech">{name}</span> exists.
            </p>
            <Link
              href="/databases"
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

      <Dialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        aria-label="Delete database"
      >
        <DialogHeader>
          <DialogTitle>Delete database</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <p className="text-sm text-text-secondary">
              This permanently removes the{" "}
              <span className="font-mono-tech font-semibold">{name}</span> folder and
              everything inside it. This cannot be undone.
            </p>
            <Label htmlFor="delete-confirm">
              Type{" "}
              <span className="font-mono-tech font-semibold text-button-error-outline-text">
                {expectedConfirm}
              </span>{" "}
              to confirm
            </Label>
            <Input
              id="delete-confirm"
              className="w-full font-mono-tech"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleDelete();
              }}
              placeholder={expectedConfirm}
              autoFocus
            />
            {deleteError && (
              <p className="text-sm text-button-error-outline-text">{deleteError}</p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={() => setIsDeleteOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            appearance="fill"
            onPress={handleDelete}
            isDisabled={isDeleting || confirmText.trim() !== expectedConfirm}
          >
            {isDeleting ? "Deleting…" : "Delete"}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        isOpen={isInstallOpen}
        onOpenChange={setIsInstallOpen}
        aria-label="Install database"
      >
        <DialogHeader>
          <DialogTitle>
            {isInstalling ? "Installing…" : "Install Database"}
          </DialogTitle>
        </DialogHeader>
        {isInstalling ? (
          <DialogBody>
            <InstallLoader />
            <p className="pb-2 text-center text-sm text-text-tertiary">
              Installing via apt — this takes a few minutes. Keep this page
              open.
            </p>
          </DialogBody>
        ) : (
          <>
            <DialogBody>
              <div className="space-y-3">
                <Input
                  value={installQuery}
                  onChange={(e) => setInstallQuery(e.target.value)}
                  placeholder="Search options…"
                  aria-label="Search install options"
                  autoFocus
                  className="w-full"
                />
                <div className="scrollbar-thin max-h-64 overflow-y-auto">
                  {filteredOptions.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                      No options found.
                    </p>
                  )}
                  {filteredOptions.map((o) => (
                    <button
                      key={o.id}
                      onClick={handleInstall}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-background-gray-primary"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-sm font-bold text-text-primary">
                        {o.label.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">
                          {o.label}
                        </span>
                        <span className="block truncate text-xs text-text-tertiary">
                          {o.hint}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-text-tertiary">›</span>
                    </button>
                  ))}
                </div>
              </div>
            </DialogBody>
            <DialogFooter>
              <Button
                variant="primary"
                appearance="outline"
                onPress={() => setIsInstallOpen(false)}
              >
                Cancel
              </Button>
            </DialogFooter>
          </>
        )}
      </Dialog>
    </AppShell>
  );
}
