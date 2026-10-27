"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Button } from "@/components/tailgrids/core/button";
import { Skeleton } from "@/components/tailgrids/core/skeleton";
import { formatSize } from "./file-row";

interface PreviewData {
  name: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content: string;
}

export default function FilePreview({
  filePath,
  onClose,
}: {
  filePath: string | null;
  onClose: () => void;
}) {
  const [data, setData] = useState<PreviewData | null>(null);

  useEffect(() => {
    if (!filePath) {
      setData(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/files/content?path=${encodeURIComponent(filePath)}`, {
      cache: "no-store",
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!cancelled) setData(json as PreviewData | null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [filePath]);

  return (
    <Dialog
      isOpen={filePath !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      aria-label="File preview"
      className="max-w-3xl"
    >
      <DialogHeader>
        <DialogTitle>
          <span className="font-mono-tech">{filePath?.split("/").pop()}</span>
        </DialogTitle>
      </DialogHeader>
      <DialogBody>
        {!data ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : data.binary ? (
          <p className="rounded-lg border border-card-border bg-background-gray-primary/40 px-3 py-6 text-center text-sm text-text-tertiary">
            Preview not available for binary files ({formatSize(data.size)}).
          </p>
        ) : (
          <>
            <pre className="scrollbar-thin max-h-96 overflow-auto rounded-lg bg-zinc-950 p-4 font-mono-tech text-xs leading-relaxed whitespace-pre-wrap text-zinc-200">
              {data.content || "(empty file)"}
            </pre>
            <p className="mt-2 font-mono-tech text-[11px] text-text-tertiary">
              {formatSize(data.size)}
              {data.truncated ? " · showing first 200 KB (read-only)" : " · read-only"}
            </p>
          </>
        )}
      </DialogBody>
      <DialogFooter>
        <Button variant="primary" appearance="outline" onPress={onClose}>
          Close
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
