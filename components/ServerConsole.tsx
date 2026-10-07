"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardHeader, CardTitle } from "@/components/tailgrids/core/card";

export default function ServerConsole({
  serverName,
  running,
}: {
  serverName: string;
  running: boolean;
}) {
  const [log, setLog] = useState<string>("");
  const boxRef = useRef<HTMLDivElement>(null);

  const fetchLog = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/servers/${encodeURIComponent(serverName)}/log?lines=200`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const json = (await res.json()) as { log?: unknown };
      if (typeof json.log === "string") setLog(json.log);
    } catch {
      // Keep last known output on transient failures.
    }
  }, [serverName]);

  useEffect(() => {
    fetchLog();
    const id = setInterval(fetchLog, 2000);
    return () => clearInterval(id);
  }, [fetchLog]);

  useEffect(() => {
    const el = boxRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  return (
    <Card>
      <CardHeader className="mb-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">›_</span>
          <CardTitle>Console</CardTitle>
        </div>
        <Badge color={running ? "success" : "gray"} size="sm">
          {running ? "Live" : "Idle"}
        </Badge>
      </CardHeader>
      <div
        ref={boxRef}
        className="scrollbar-thin h-64 overflow-y-auto rounded-lg bg-zinc-950 p-3 font-mono-tech text-xs leading-relaxed whitespace-pre-wrap text-zinc-200"
      >
        {log ? log : "No output yet. Start the server to see live logs."}
      </div>
    </Card>
  );
}
