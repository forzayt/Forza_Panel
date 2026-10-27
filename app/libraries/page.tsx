"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import { cn } from "@/utils/cn";
import { LIBRARIES, LIBRARY_CATEGORIES, type LibraryItem, type LibraryCategory } from "./_data";

function categoryColor(category: LibraryCategory) {
  if (category === "Language") return "primary" as const;
  if (category === "Runtime") return "sky" as const;
  return "warning" as const;
}

function LibraryCard({ item }: { item: LibraryItem }) {
  return (
    <Card className="h-full transition-transform hover:-translate-y-0.5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg font-mono-tech text-xs font-bold",
            item.accent,
          )}
        >
          {item.icon}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-text-primary">{item.name}</p>
            <Badge color={categoryColor(item.category)} size="sm">
              {item.category}
            </Badge>
          </div>
          <p className="mt-1 text-xs leading-5 text-text-tertiary">{item.description}</p>
        </div>
      </div>
    </Card>
  );
}

export default function LibrariesPage() {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<LibraryCategory | "all">("all");

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
          <Badge color="primary" size="sm">
            {LIBRARIES.length} stacks · {LIBRARY_CATEGORIES.length} categories
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
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((item) => (
              <LibraryCard key={item.name} item={item} />
            ))}
          </div>
        )}

        {visible.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-text-tertiary">
            Showing {visible.length} of {LIBRARIES.length} stacks
          </p>
        )}
      </div>
    </AppShell>
  );
}
