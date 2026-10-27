"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
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
import {
  Select,
  SelectContent,
  SelectIndicator,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/tailgrids/core/select";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import { usePrivilegeGate } from "@/components/common/privilege-dialog";
import type { LibraryDetail, LibraryStatus } from "@/agent/libraries";
import { LIBRARIES, LIBRARY_CATEGORIES, type LibraryItem, type LibraryCategory } from "./_data";

function categoryColor(category: LibraryCategory) {
  if (category === "Language") return "primary" as const;
  if (category === "Runtime") return "sky" as const;
  return "warning" as const;
}

type LibrarySort = "installed" | "name" | "name-desc" | "category";

const SORT_OPTIONS: { value: LibrarySort; label: string }[] = [
  { value: "installed", label: "Installed first" },
  { value: "name", label: "Name (A–Z)" },
  { value: "name-desc", label: "Name (Z–A)" },
  { value: "category", label: "Category" },
];

function StatusLabel({
  status,
  failed,
}: {
  status: LibraryStatus | null | undefined;
  failed: boolean;
}) {
  if (failed) {
    return (
      <Badge color="gray" size="sm" className="shrink-0">
        Unknown
      </Badge>
    );
  }
  if (!status) {
    return (
      <Badge color="gray" size="sm" className="shrink-0">
        Checking…
      </Badge>
    );
  }
  if (!status.installed) {
    return (
      <Badge color="gray" size="sm" className="shrink-0">
        Not installed
      </Badge>
    );
  }
  return (
    <Badge color="success" size="sm" className="shrink-0">
      Installed{status.version ? ` ${status.version}` : ""}
    </Badge>
  );
}

function LibraryRow({
  item,
  status,
  failed,
  onOpen,
}: {
  item: LibraryItem;
  status: LibraryStatus | null | undefined;
  failed: boolean;
  onOpen: () => void;
}) {
  return (
    <div
      role='button'
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      aria-label={`${item.name} details`}
      className='w-full cursor-pointer rounded-xl text-left outline-none focus-visible:ring-4 focus-visible:ring-input-primary-focus-border/20'
    >
      <Card className="flex items-center gap-4 py-3.5 transition-colors hover:border-button-primary-outline-stroke">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono-tech text-[11px] font-bold",
            item.accent,
          )}
        >
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
          <p className="truncate text-xs leading-5 text-text-tertiary">{item.description}</p>
        </div>
        <StatusLabel status={status} failed={failed} />
        <Badge color={categoryColor(item.category)} size="sm" className="hidden shrink-0 sm:inline-flex">
          {item.category}
        </Badge>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className="size-4 shrink-0 text-text-tertiary"
          aria-hidden="true"
        >
          <path d="m9 6 6 6-6 6" />
        </svg>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <span className="text-xs text-text-tertiary">{label}</span>
      <span className="min-w-0 text-right text-xs font-medium text-text-primary">{value}</span>
    </div>
  );
}

export default function LibrariesPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | "all">("all");
  const [sort, setSort] = useState<LibrarySort>("installed");
  const [statuses, setStatuses] = useState<Record<string, LibraryStatus> | null>(null);
  const [statusError, setStatusError] = useState(false);

  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [detail, setDetail] = useState<LibraryDetail | null>(null);
  const [detailError, setDetailError] = useState(false);
  const [version, setVersion] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmUninstall, setConfirmUninstall] = useState(false);
  // Asks for the sudo password when apt answers "privilege-required".
  const gate = usePrivilegeGate();

  const refreshStatuses = useCallback(async () => {
    try {
      const res = await fetch("/api/libraries", { cache: "no-store" });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as { items: LibraryStatus[] };
      setStatuses(
        Object.fromEntries(json.items.map((item): [string, LibraryStatus] => [item.id, item])),
      );
      setStatusError(false);
    } catch {
      setStatusError(true);
    }
  }, []);

  useEffect(() => {
    refreshStatuses();
  }, [refreshStatuses]);

  // Load the details (package, versions) whenever a row is opened.
  useEffect(() => {
    if (!selected) return;
    let cancelled = false;

    setDetail(null);
    setDetailError(false);
    setActionError(null);
    setConfirmUninstall(false);
    setVersion("");

    fetch(`/api/libraries/${encodeURIComponent(selected.id)}`, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return res.json() as Promise<LibraryDetail>;
      })
      .then((json) => {
        if (cancelled) return;
        setDetail(json);
        setVersion(json.installedPackageVersion ?? json.versions[0] ?? "");
      })
      .catch(() => {
        if (!cancelled) setDetailError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [selected]);

  const reloadDetail = useCallback(async (item: LibraryItem) => {
    try {
      const res = await fetch(`/api/libraries/${encodeURIComponent(item.id)}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const json = (await res.json()) as LibraryDetail;
      setDetail(json);
      setVersion(json.installedPackageVersion ?? json.versions[0] ?? "");
    } catch {
      // Keep the previous detail; the toast already reported the outcome.
    }
  }, []);

  const handleInstall = async () => {
    if (!selected || !detail) return;
    setIsBusy(true);
    setActionError(null);
    try {
      const { res, json } = await gate.request<{
        error?: string;
        version?: string | null;
      }>(`/api/libraries/${encodeURIComponent(selected.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(version ? { version } : {}),
      });
      if (!res.ok) {
        setActionError(json?.error ?? `Failed to update library (${res.status}).`);
        return;
      }
      toast.success(
        `${selected.name} ${detail.installed ? "updated" : "installed"}${
          json?.version ? ` — ${json.version}` : ""
        }.`,
      );
      await Promise.all([reloadDetail(selected), refreshStatuses()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to update library.");
    } finally {
      setIsBusy(false);
    }
  };

  const handleUninstall = async () => {
    if (!selected) return;
    setIsBusy(true);
    setActionError(null);
    try {
      const { res, json } = await gate.request<{ error?: string }>(
        `/api/libraries/${encodeURIComponent(selected.id)}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        setActionError(json?.error ?? `Failed to uninstall (${res.status}).`);
        return;
      }
      toast.success(`${selected.name} uninstalled.`);
      setConfirmUninstall(false);
      await Promise.all([reloadDetail(selected), refreshStatuses()]);
    } catch (e) {
      setActionError(e instanceof Error ? e.message : "Failed to uninstall.");
    } finally {
      setIsBusy(false);
    }
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = LIBRARIES.filter((item) => {
      const inCategory = activeCategory === "all" || item.category === activeCategory;
      const matches =
        !q ||
        [item.name, item.description, item.category].join(" ").toLowerCase().includes(q);
      return inCategory && matches;
    });

    const list = [...filtered];
    if (sort === "installed") {
      // Installed first, then unknown (still probing), then not installed.
      const rank = (item: LibraryItem) => {
        const status = statuses?.[item.id];
        if (!status) return 1;
        return status.installed ? 0 : 2;
      };
      list.sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
    } else if (sort === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === "name-desc") {
      list.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      list.sort(
        (a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name),
      );
    }
    return list;
  }, [query, activeCategory, sort, statuses]);

  const installedCount = statuses
    ? LIBRARIES.filter((item) => statuses[item.id]?.installed).length
    : null;

  const versionUnchanged =
    !!detail?.installed &&
    !!detail.installedPackageVersion &&
    version === detail.installedPackageVersion;
  const canSubmit = !!detail?.canManage && !isBusy && !versionUnchanged;

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Libraries
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Languages, runtimes and databases you can run on this host.
            </p>
          </div>
          <Badge color={statusError ? "error" : "primary"} size="sm">
            {statusError
              ? "Detection unavailable"
              : installedCount === null
                ? `Checking ${LIBRARIES.length} stacks…`
                : `${installedCount} of ${LIBRARIES.length} installed`}
          </Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full max-w-md">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search libraries…"
              aria-label="Search libraries"
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeCategory === "all"
                  ? "bg-tab-active-background text-text-primary shadow-xs"
                  : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
              )}
            >
              All
            </button>
            {LIBRARY_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeCategory === category
                    ? "bg-tab-active-background text-text-primary shadow-xs"
                    : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
                )}
              >
                {category}s
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 sm:ml-auto">
            <span className="shrink-0 text-xs font-medium text-text-tertiary">Sort</span>
            <Select
              aria-label="Sort libraries"
              value={sort}
              onChange={(value) => setSort(value as LibrarySort)}
              className="w-48"
            >
              <SelectTrigger size="sm" className="h-9 w-full justify-between">
                <span aria-hidden="true" className="shrink-0 text-text-tertiary">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    className="size-4"
                  >
                    <path d="M7 4v16M7 20l-3-3M7 20l3-3M17 20V4M17 4l-3 3M17 4l3 3" />
                  </svg>
                </span>
                <SelectValue className="min-w-0 flex-1 truncate text-left" />
                <SelectIndicator />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} id={option.value} textValue={option.label}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {visible.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-text-tertiary">
              No libraries match “{query.trim()}”.
            </p>
          </Card>
        )}

        {visible.length > 0 && (
          <div className="space-y-2">
            {visible.map((item) => (
              <LibraryRow
                key={item.id}
                item={item}
                status={statuses?.[item.id]}
                failed={statusError}
                onOpen={() => setSelected(item)}
              />
            ))}
          </div>
        )}

        {statusError && (
          <p className="text-center text-[11px] text-text-tertiary">
            Could not reach <span className="font-mono-tech">/api/libraries</span> — install
            status is unknown.
          </p>
        )}

        {visible.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-text-tertiary">
            Showing {visible.length} of {LIBRARIES.length} stacks · detected on this host with{" "}
            <span className="font-mono-tech">--version</span>
          </p>
        )}
      </div>

      <Dialog
        isOpen={selected !== null}
        onOpenChange={(open) => {
          if (!open && !isBusy) setSelected(null);
        }}
        aria-label='Library details'
        className='max-h-[90vh] max-w-md overflow-y-auto'
      >
        <DialogHeader>
          <DialogTitle>{selected?.name ?? "Library"}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          {selected && (
            <div className='space-y-4'>
              <div className='flex items-center gap-2'>
                <Badge color={categoryColor(selected.category)} size='sm'>
                  {selected.category}
                </Badge>
                <StatusLabel status={detail ?? statuses?.[selected.id]} failed={detailError} />
              </div>

              <p className='text-sm leading-5 text-text-secondary'>{selected.description}</p>

              <div className='divide-y divide-card-border rounded-lg border border-card-border px-3'>
                <DetailRow
                  label='Installed version'
                  value={detail?.version ?? (detail?.installed === false ? "Not installed" : "—")}
                />
                <DetailRow
                  label='Package'
                  value={
                    detail?.package ? (
                      <span className='font-mono-tech'>{detail.package}</span>
                    ) : (
                      "—"
                    )
                  }
                />
                {detail?.installedPackageVersion && (
                  <DetailRow
                    label='apt build'
                    value={
                      <span className='font-mono-tech'>{detail.installedPackageVersion}</span>
                    }
                  />
                )}
                <DetailRow
                  label='Platform'
                  value={<span className='font-mono-tech'>{detail?.platform ?? "—"}</span>}
                />
              </div>

              {detailError && (
                <p className='text-sm text-button-error-outline-text'>
                  Could not load details for this stack.
                </p>
              )}

              {detail && !detailError && detail.canManage && (
                <div className='space-y-2'>
                  <Label>Install version</Label>
                  {detail.versions.length > 0 ? (
                    <Select
                      aria-label='Install version'
                      value={version}
                      onChange={(value) => setVersion(value as string)}
                      isDisabled={isBusy}
                      className='w-full'
                    >
                      <SelectTrigger className='h-11 w-full justify-between'>
                        <SelectValue className='min-w-0 flex-1 truncate text-left' />
                        <SelectIndicator />
                      </SelectTrigger>
                      <SelectContent>
                        {detail.versions.map((option) => (
                          <SelectItem
                            key={option}
                            id={option}
                            textValue={option}
                            className='py-2'
                          >
                            <span className='flex min-w-0 items-center gap-2'>
                              <span className='truncate font-mono-tech text-xs'>{option}</span>
                              {option === detail.installedPackageVersion && (
                                <span className='shrink-0 rounded bg-brand-500/10 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-brand-500 uppercase'>
                                  installed
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className='rounded-lg border border-dashed border-card-border px-3 py-2.5 text-xs text-text-tertiary'>
                      No version list available — Install uses the distro's default package.
                    </div>
                  )}
                  <p className='text-[11px] text-text-tertiary'>
                    Versions come from <span className='font-mono-tech'>apt-cache policy</span>.
                    Switching releases uses apt through the panel&apos;s root helper; without
                    it you&apos;ll be asked for the sudo password once.
                  </p>
                </div>
              )}

              {detail && !detailError && !detail.canManage && (
                <p className='text-xs leading-5 text-text-tertiary'>
                  Install, uninstall and version changes are available on Linux hosts with apt.
                  This panel runs on <span className='font-mono-tech'>{detail.platform}</span>.
                </p>
              )}

              {actionError && (
                <p className='text-sm text-button-error-outline-text'>{actionError}</p>
              )}

              {confirmUninstall && (
                <p className='rounded-lg border border-button-error-outline-stroke/40 bg-button-error-background/10 px-3 py-2 text-xs leading-5 text-button-error-outline-text'>
                  Uninstall {selected.name}? Its apt package will be removed from this host.
                </p>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {confirmUninstall ? (
            <>
              <Button
                variant='primary'
                appearance='outline'
                onPress={() => setConfirmUninstall(false)}
                isDisabled={isBusy}
              >
                Cancel
              </Button>
              <Button
                variant='danger'
                appearance='fill'
                onPress={handleUninstall}
                isDisabled={isBusy}
              >
                {isBusy ? "Uninstalling…" : "Uninstall now"}
              </Button>
            </>
          ) : (
            <>
              {detail?.installed && detail.canManage && (
                <Button
                  variant='danger'
                  appearance='outline'
                  onPress={() => setConfirmUninstall(true)}
                  isDisabled={isBusy}
                >
                  Uninstall
                </Button>
              )}
              <Button
                variant='primary'
                appearance='outline'
                onPress={() => setSelected(null)}
                isDisabled={isBusy}
              >
                Close
              </Button>
              {detail?.canManage && (
                <Button
                  variant='primary'
                  appearance='fill'
                  onPress={handleInstall}
                  isDisabled={!canSubmit}
                >
                  {isBusy
                    ? "Working…"
                    : detail.installed
                      ? versionUnchanged
                        ? "Installed"
                        : "Change version"
                      : "Install"}
                </Button>
              )}
            </>
          )}
        </DialogFooter>

        {/* sudo prompt — nested here so focus containment of this modal
            doesn't fight the password dialog */}
        {gate.dialog}
      </Dialog>
    </AppShell>
  );
}
