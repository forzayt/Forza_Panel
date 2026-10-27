"use client";

import { useMemo, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { Input } from "@/components/tailgrids/core/input";
import { cn } from "@/utils/cn";
import { toast } from "sonner";
import {
  LIBRARY_GROUPS,
  TOTAL_LIBRARIES,
  type LibraryGroup,
  type LibraryItem,
} from "./_data";

function CopyCommand({ command, name }: { command: string; name: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      toast.success(`Copied install command for ${name}`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Could not copy to clipboard.");
    }
  };

  return (
    <div className="mt-2 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-background-gray-secondary px-2.5 py-1.5 font-mono-tech text-[11px] text-text-secondary">
        {command}
      </code>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy install command for ${name}`}
        className="shrink-0 rounded-lg border-[0.5px] border-card-border px-2 py-1 text-[11px] text-text-tertiary transition-colors hover:text-text-primary"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function LibraryRow({ library, accent }: { library: LibraryItem; accent: string }) {
  return (
    <Card className="py-3.5">
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg font-mono-tech text-[11px] font-bold",
            accent,
          )}
        >
          {library.name.charAt(0).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-mono-tech text-sm font-medium text-text-primary">
              {library.name}
            </p>
            <span className="flex flex-wrap gap-1">
              {library.tags.map((tag) => (
                <Badge key={tag} color="gray" size="sm">
                  {tag}
                </Badge>
              ))}
            </span>
          </div>
          <p className="mt-0.5 text-xs leading-5 text-text-tertiary">{library.description}</p>
          <CopyCommand command={library.install} name={library.name} />
        </div>
      </div>
    </Card>
  );
}

function LibrarySection({ group }: { group: LibraryGroup }) {
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
            group.accent,
          )}
        >
          {group.icon}
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-text-primary">
            {group.label}
            <span className="ml-2 font-mono-tech text-xs font-normal text-text-tertiary">
              {group.libraries.length}
            </span>
          </h2>
          <p className="truncate text-xs text-text-tertiary">{group.description}</p>
        </div>
        <Badge color="gray" size="sm" className="ml-auto font-mono-tech">
          {group.registry}
        </Badge>
      </div>

      <div className="grid gap-2">
        {group.libraries.map((library) => (
          <LibraryRow key={library.name} library={library} accent={group.accent} />
        ))}
      </div>
    </section>
  );
}

export default function LibrariesPage() {
  const [query, setQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState<string>("all");

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matches = (library: LibraryItem) =>
      !q ||
      [library.name, library.description, library.install, ...library.tags]
        .join(" ")
        .toLowerCase()
        .includes(q);

    return LIBRARY_GROUPS.filter((group) => activeGroup === "all" || group.id === activeGroup)
      .map((group) => ({ ...group, libraries: group.libraries.filter(matches) }))
      .filter((group) => group.libraries.length > 0);
  }, [query, activeGroup]);

  const visibleCount = visibleGroups.reduce((sum, group) => sum + group.libraries.length, 0);

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Libraries
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Popular libraries for the stacks you run — copy a command to install.
            </p>
          </div>
          <Badge color="primary" size="sm">
            {TOTAL_LIBRARIES} libraries · {LIBRARY_GROUPS.length} ecosystems
          </Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="w-full max-w-md">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search libraries, commands or tags…"
              aria-label="Search libraries"
              className="w-full"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveGroup("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                activeGroup === "all"
                  ? "bg-tab-active-background text-text-primary shadow-xs"
                  : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
              )}
            >
              All
            </button>
            {LIBRARY_GROUPS.map((group) => (
              <button
                key={group.id}
                type="button"
                onClick={() => setActiveGroup(group.id)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  activeGroup === group.id
                    ? "bg-tab-active-background text-text-primary shadow-xs"
                    : "text-text-secondary hover:bg-sidebar-navigation-nav-item-nav-hover-background hover:text-text-primary",
                )}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>

        {visibleGroups.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-text-tertiary">
              No libraries match “{query.trim()}”.
            </p>
          </Card>
        )}

        {visibleGroups.map((group) => (
          <LibrarySection key={group.id} group={group} />
        ))}

        {visibleGroups.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-text-tertiary">
            Showing {visibleCount} of {TOTAL_LIBRARIES} libraries · commands are plain{" "}
            <span className="font-mono-tech">npm</span>,{" "}
            <span className="font-mono-tech">pip</span> and{" "}
            <span className="font-mono-tech">composer</span> installs
          </p>
        )}
      </div>
    </AppShell>
  );
}
