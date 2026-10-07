"use client";

import { useCallback, useEffect, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import FileRow from "./_components/file-row";
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
          <Badge color="gray" size="sm">
            Read-only
          </Badge>
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

        {!error && entries === null && (
          <Card className="space-y-2 p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </Card>
        )}

        {!error && entries !== null && entries.length === 0 && (
          <Card className="text-center">
            <p className="text-sm text-text-tertiary">This folder is empty.</p>
          </Card>
        )}

        {!error && entries !== null && entries.length > 0 && (
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
      </div>

      <FilePreview filePath={previewPath} onClose={() => setPreviewPath(null)} />
    </AppShell>
  );
}
