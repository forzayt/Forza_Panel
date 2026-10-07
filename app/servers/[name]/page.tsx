"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import AppShell from "@/components/common/app-shell";
import InstallLoader from "@/components/InstallLoader";
import ServerConsole from "@/components/ServerConsole";
import { Badge } from "@/components/tailgrids/core/badge";
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
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import type { ServerRecord } from "@/agent/servers";
import type { TemplateSummary } from "@/agent/templates";
import { toast } from "sonner";

function formatDateTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleString();
}

export default function ServerDetailPage() {
  const params = useParams<{ name: string }>();
  const router = useRouter();
  const name = params.name ? decodeURIComponent(params.name) : "";
  const [server, setServer] = useState<ServerRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateSummary[] | null>(null);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [tplQuery, setTplQuery] = useState("");
  const [importingId, setImportingId] = useState<string | null>(null);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateSummary | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [serverAction, setServerAction] = useState<"starting" | "stopping" | null>(null);

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
    // Re-poll status so the badge self-corrects if the process dies.
    const id = setInterval(fetchServer, 5000);
    return () => clearInterval(id);
  }, [fetchServer]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/templates", { cache: "no-store" });
      if (!res.ok) return;
      const json = (await res.json()) as { templates: TemplateSummary[] };
      setTemplates(json.templates);
    } catch {
      // Template dropdown stays empty — non-fatal.
    }
  }, []);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const filteredTemplates = (templates ?? []).filter((t) => {
    const q = tplQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      t.id.toLowerCase().includes(q) ||
      t.label.toLowerCase().includes(q) ||
      t.game.toLowerCase().includes(q)
    );
  });

  const openImport = () => {
    setTplQuery("");
    setPendingTemplate(null);
    setIsInstalling(false);
    setIsImportOpen(true);
  };

  const handleServerPower = async (action: "start" | "stop") => {
    setServerAction(action === "start" ? "starting" : "stopping");
    try {
      const res = await fetch(`/api/servers/${encodeURIComponent(name)}/${action}`, {
        method: "POST",
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(json?.error ?? `Failed to ${action} server (${res.status}).`);
        return;
      }
      toast.success(
        action === "start" ? `Server "${name}" started.` : `Server "${name}" stopped.`
      );
      fetchServer();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to ${action} server.`);
    } finally {
      setServerAction(null);
    }
  };

  const handleImport = async (templateId: string) => {
    setImportingId(templateId);
    setIsInstalling(true);
    const started = Date.now();
    try {
      const res = await fetch(`/api/servers/${encodeURIComponent(name)}/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId }),
      });
      const json = (await res.json().catch(() => null)) as {
        error?: string;
        details?: string;
      } | null;
      if (!res.ok) {
        const reason = json?.details || json?.error || `Import failed (${res.status}).`;
        toast.error(reason.length > 220 ? reason.slice(0, 220) + "…" : reason);
        setIsInstalling(false);
        return;
      }
      // Keep the animation visible for a full 5 seconds.
      const elapsed = Date.now() - started;
      if (elapsed < 5000) {
        await new Promise((r) => setTimeout(r, 5000 - elapsed));
      }
      toast.success(`Template imported into "${name}".`);
      setIsImportOpen(false);
      setPendingTemplate(null);
      setIsInstalling(false);
      fetchServer();
    } catch (e) {
      setIsInstalling(false);
      toast.error(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImportingId(null);
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
      const res = await fetch(`/api/servers/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setDeleteError(json?.error ?? `Failed to delete server (${res.status}).`);
        return;
      }
      setIsDeleteOpen(false);
      toast.success(`Server "${name}" deleted.`);
      router.push("/servers");
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : "Failed to delete server.");
    } finally {
      setIsDeleting(false);
    }
  };

  const details = server
    ? [
        { label: "Status", value: server.status },
        { label: "Type", value: server.type },
        { label: "Created", value: formatDateTime(server.createdAt) },
        { label: "Folder", value: `data/servers/${server.name}` },
      ]
    : [];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
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
          {server && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {server.status === "running" ? (
                <Button
                  variant="danger"
                  appearance="outline"
                  size="md"
                  onPress={() => handleServerPower("stop")}
                  isDisabled={serverAction !== null}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                  {serverAction === "stopping" ? "Stopping…" : "Stop"}
                </Button>
              ) : (
                <Button
                  variant="primary"
                  appearance="fill"
                  size="md"
                  onPress={() => handleServerPower("start")}
                  isDisabled={serverAction !== null}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="size-4"
                    aria-hidden="true"
                  >
                    <path d="M8 5.5v13l11-6.5-11-6.5z" />
                  </svg>
                  {serverAction === "starting" ? "Starting…" : "Start"}
                </Button>
              )}
              {server.type === "Server" && (
                <Button variant="success" appearance="fill" size="md" onPress={openImport}>
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
                  Import
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
          <>
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
            {server.template && (
              <ServerConsole serverName={server.name} running={server.status === "running"} />
            )}
          </>
        )}
      </div>

      <Dialog
        isOpen={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        aria-label="Delete server"
      >
        <DialogHeader>
          <DialogTitle>Delete server</DialogTitle>
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
            {isDeleting ? "Deleting…" : "Delete Server"}
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        isOpen={isImportOpen}
        onOpenChange={(open) => {
          setIsImportOpen(open);
          if (!open) setPendingTemplate(null);
        }}
        aria-label="Import template"
      >
        <DialogHeader>
          <DialogTitle>
            {pendingTemplate ? "Confirm Import" : "Import Template"}
          </DialogTitle>
        </DialogHeader>
        {pendingTemplate ? (
          isInstalling ? (
            <DialogBody>
              <InstallLoader />
            </DialogBody>
          ) : (
            <>
              <DialogBody>
                <div className="space-y-2">
                  <p className="text-sm text-text-secondary">
                    You selected{" "}
                    <span className="font-semibold text-text-primary">
                      {pendingTemplate.label}
                    </span>
                    .
                  </p>
                  <p className="rounded-lg border border-button-error-outline-stroke bg-button-error-outline-background px-3 py-2 text-sm text-button-error-outline-text">
                    This will install server files into this folder.
                  </p>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button
                  variant="primary"
                  appearance="outline"
                  onPress={() => setPendingTemplate(null)}
                >
                  Back
                </Button>
                <Button
                  variant="success"
                  appearance="fill"
                  onPress={() => handleImport(pendingTemplate.id)}
                  isDisabled={importingId !== null}
                >
                  {importingId ? "Installing…" : "Install Files"}
                </Button>
              </DialogFooter>
            </>
          )
        ) : (
          <>
            <DialogBody>
              <div className="space-y-3">
                <Input
                  value={tplQuery}
                  onChange={(e) => setTplQuery(e.target.value)}
                  placeholder="Search templates…"
                  aria-label="Search templates"
                  autoFocus
                  className="w-full"
                />
                <div className="scrollbar-thin max-h-64 overflow-y-auto">
                  {templates === null && (
                    <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                      Loading templates…
                    </p>
                  )}
                  {templates !== null && filteredTemplates.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-text-tertiary">
                      No templates found.
                    </p>
                  )}
                  {filteredTemplates.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setPendingTemplate(t)}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-background-gray-primary"
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-sm font-bold text-text-primary">
                        {t.label.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-text-primary">
                          {t.label}
                        </span>
                        <span className="block truncate text-xs text-text-tertiary">
                          {t.game}
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
                onPress={() => setIsImportOpen(false)}
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
