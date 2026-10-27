"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import FileRow from "./_components/file-row";
import FileGridTile from "./_components/file-grid";
import FilePreview from "./_components/file-preview";

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export default function FilesPage() {
  const [path, setPath] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [entries, setEntries] = useState<FileEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewPath, setPreviewPath] = useState<string | null>(null);

  const fetchDir = useCallback(async (dir: string) => {
    setEntries(null);
    setError(null);
    try {
      const res = await fetch(`/api/files?path=${encodeURIComponent(dir)}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`API responded ${res.status}`);
      const json = (await res.json()) as { entries: FileEntry[] };
      setEntries(json.entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load folder");
    }
  }, []);

  useEffect(() => {
    fetchDir(path);
  }, [fetchDir, path]);

  const crumbs = path ? path.split("/") : [];
  const crumbPath = (i: number) => crumbs.slice(0, i + 1).join("/");

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Files
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Browse the panel repo — read-only
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge color="gray" size="sm">
              Read-only
            </Badge>
            <div
              role="group"
              aria-label="View mode"
              className="flex items-center gap-1 rounded-lg border border-card-border bg-card-background p-1"
            >
            <button
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              title="Grid view"
              className={`rounded-md p-1.5 transition-colors ${
                view === "grid"
                  ? "bg-background-gray-primary text-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
            </button>
            <button
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              title="List view"
              className={`rounded-md p-1.5 transition-colors ${
                view === "list"
                  ? "bg-background-gray-primary text-text-primary"
                  : "text-text-tertiary hover:text-text-primary"
              }`}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-4 w-4">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <div className="flex flex-wrap items-center gap-1.5 text-sm">
          <button
            onClick={() => setPath("")}
            className={`rounded px-1.5 py-0.5 font-mono-tech transition-colors hover:text-text-primary ${
              path === "" ? "text-text-primary" : "text-text-tertiary"
            }`}
          >
            /
          </button>
          {crumbs.map((c, i) => (
            <span key={crumbPath(i)} className="flex items-center gap-1.5">
              <span className="text-text-tertiary">›</span>
              <button
                onClick={() => setPath(crumbPath(i))}
                className={`rounded px-1.5 py-0.5 font-mono-tech transition-colors hover:text-text-primary ${
                  i === crumbs.length - 1 ? "text-text-primary" : "text-text-tertiary"
                }`}
              >
                {c}
              </button>
            </span>
          ))}
        </div>

        {error && (
          <Card>
            <p className="text-sm text-button-error-outline-text">
              Could not load folder: {error}
            </p>
          </Card>
        )}

        {!error && entries === null && view === "list" && (
          <Card className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </Card>
        )}

        {!error && entries === null && view === "grid" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        )}

        {!error && entries !== null && entries.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-text-tertiary">This folder is empty.</p>
          </Card>
        )}

        {!error && entries !== null && entries.length > 0 && view === "list" && (
          <Card className="divide-y divide-card-border overflow-hidden p-0">
            {entries.map((e) => (
              <FileRow
                key={e.path}
                name={e.name}
                isDirectory={e.isDirectory}
                size={e.size}
                modified={e.modified}
                onOpen={() => {
                  if (e.isDirectory) setPath(e.path);
                  else setPreviewPath(e.path);
                }}
              />
            ))}
          </Card>
        )}

        {!error && entries !== null && entries.length > 0 && view === "grid" && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
            {entries.map((e) => (
              <FileGridTile
                key={e.path}
                name={e.name}
                isDirectory={e.isDirectory}
                size={e.size}
                onOpen={() => {
                  if (e.isDirectory) setPath(e.path);
                  else setPreviewPath(e.path);
                }}
              />
            ))}
          </div>
        )}
      </div>

      <FilePreview filePath={previewPath} onClose={() => setPreviewPath(null)} />
    </AppShell>
  );
}
