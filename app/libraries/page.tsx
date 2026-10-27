"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import { cn } from "@/utils/cn";
import type { LibraryStatus } from "@/agent/libraries";
import { LIBRARIES, LIBRARY_CATEGORIES, type LibraryItem, type LibraryCategory } from "./_data";

function categoryColor(category: LibraryCategory) {
  if (category === "Language") return "primary" as const;
  if (category === "Runtime") return "sky" as const;
  return "warning" as const;
}

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
}: {
  item: LibraryItem;
  status: LibraryStatus | null | undefined;
  failed: boolean;
}) {
  return (
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
    </Card>
  );
}

export default function LibrariesPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | "all">("all");
  const [statuses, setStatuses] = useState<Record<string, LibraryStatus> | null>(null);
  const [statusError, setStatusError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/libraries", { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`API responded ${res.status}`);
        return res.json() as Promise<{ items: LibraryStatus[] }>;
      })
      .then((json) => {
        if (cancelled) return;
        setStatuses(
          Object.fromEntries(
            json.items.map((item): [string, LibraryStatus] => [item.id, item]),
          ),
        );
        setStatusError(false);
      })
      .catch(() => {
        if (!cancelled) setStatusError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return LIBRARIES.filter((item) => {
      const inCategory = activeCategory === "all" || item.category === activeCategory;
      const matches =
        !q ||
        [item.name, item.description, item.category].join(" ").toLowerCase().includes(q);
      return inCategory && matches;
    });
  }, [query, activeCategory]);

  const installedCount = statuses
    ? LIBRARIES.filter((item) => statuses[item.id]?.installed).length
    : null;

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
    </AppShell>
  );
}
