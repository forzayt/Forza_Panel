"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";

type TerminalStatus = "running" | "success" | "error";

interface TerminalState {
  title: string;
  subtitle: string;
  lines: string[];
  status: TerminalStatus;
  /** True until the server accepts the job (request still in flight). */
  connecting: boolean;
}

export interface TerminalRequest {
  res: Response;
  json?: { error?: string; code?: string } | null;
}

export interface TerminalRunOptions {
  title: string;
  subtitle?: string;
  /** Starts the job. Use `gate.stream(...)` so the sudo prompt is handled. */
  request: () => Promise<TerminalRequest>;
  /** Called once the job reports success (refresh lists/status here). */
  onSuccess?: (data: Record<string, unknown> | undefined) => void | Promise<void>;
  /** Called when the job ends, whatever the outcome. */
  onFinish?: () => void;
}

export interface LiveTerminal {
  run: (options: TerminalRunOptions) => Promise<{
    ok: boolean;
    error?: string;
    /** False when the terminal never opened (e.g. the sudo prompt was cancelled). */
    opened: boolean;
  }>;
  close: () => void;
  modal: React.ReactNode;
}

const LINE_DELAY_MS = 100;
// apt can be chatty; keep the tail so a long install can't grow without bound.
const MAX_LINES = 3000;

function lineClass(line: string) {
  if (line.startsWith("✓")) return "text-emerald-400";
  if (line.startsWith("✗")) return "text-red-400";
  if (line.startsWith("$")) return "text-sky-300";
  return "text-slate-300";
}

/**
 * Streams a long privileged job into a small terminal modal.
 *
 * The server answers with NDJSON (`log` lines, then one `done` event); the
 * modal stays open after the job ends so the operator can read the output.
 * Lines are batched before hitting React state so apt output doesn't re-render
 * the page once per line.
 */
export function useLiveTerminal(): LiveTerminal {
  const [state, setState] = useState<TerminalState | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pending = useRef<string[]>([]);
  const flushTimer = useRef<number | null>(null);

  const flush = useCallback(() => {
    if (flushTimer.current !== null) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    const batch = pending.current;
    pending.current = [];
    if (batch.length === 0) return;
    setState((current) => {
      if (!current) return current;
      const lines = [...current.lines, ...batch];
      return {
        ...current,
        lines: lines.length > MAX_LINES ? lines.slice(lines.length - MAX_LINES) : lines,
      };
    });
  }, []);

  const push = useCallback(
    (line: string) => {
      pending.current.push(line);
      if (flushTimer.current !== null) return;
      flushTimer.current = window.setTimeout(() => {
        flushTimer.current = null;
        flush();
      }, LINE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    box.scrollTop = box.scrollHeight;
  }, [state?.lines.length, state?.status]);

  useEffect(() => {
    return () => {
      if (flushTimer.current !== null) window.clearTimeout(flushTimer.current);
    };
  }, []);

  const run = useCallback(
    async ({
      title,
      subtitle,
      request,
      onSuccess,
      onFinish,
    }: TerminalRunOptions): Promise<{ ok: boolean; error?: string; opened: boolean }> => {
      let res: Response;
      let json: { error?: string; code?: string } | null | undefined;

      // Open the terminal *before* talking to the server. Waiting for the
      // response meant the modal only appeared when the first bytes arrived
      // (often at the very end on buffered/proxied setups). The request still
      // runs afterwards; the password prompt renders above this modal.
      if (flushTimer.current !== null) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      pending.current = [];
      setState({
        title,
        subtitle: subtitle ?? "Live output",
        lines: [],
        status: "running",
        connecting: true,
      });

      try {
        ({ res, json } = await request());
      } catch (err) {
        setState(null);
        onFinish?.();
        return {
          ok: false,
          opened: false,
          error: err instanceof Error ? err.message : "Could not start the job.",
        };
      }

      if (!res.ok || !res.body) {
        // Nothing streamed — close the terminal and let the page show the
        // error inline (bad request, …). A 403 means the operator dismissed
        // the sudo prompt: stay quiet, they chose to cancel.
        setState(null);
        onFinish?.();
        const cancelled =
          res.status === 403 && json?.code === "privilege-required";
        return {
          ok: false,
          opened: false,
          error: cancelled
            ? undefined
            : (json?.error ?? `Request failed (${res.status}).`),
        };
      }

      let ok = false;
      let failure: string | undefined;
      let terminalError: string | undefined;

      setState((current) => (current ? { ...current, connecting: false } : current));

      try {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        const handle = (raw: string) => {
          let event: {
            type?: string;
            line?: string;
            ok?: boolean;
            error?: string;
            data?: Record<string, unknown>;
          };
          try {
            event = JSON.parse(raw);
          } catch {
            return;
          }

          if (event.type === "log" && typeof event.line === "string") {
            push(event.line);
            return;
          }

          if (event.type === "done") {
            flush();
            if (event.ok) {
              ok = true;
              setState((current) =>
                current ? { ...current, status: "success" } : current,
              );
              // Refresh work happens after the terminal flips to success; a
              // rejected refresh must not surface as an unhandled rejection.
              Promise.resolve(onSuccess?.(event.data)).catch(() => {});
              return;
            }

            failure = event.error ?? "The command failed.";
            terminalError = failure;
            push(`✗ ${failure}`);
            flush();
            setState((current) =>
              current ? { ...current, status: "error" } : current,
            );
          }
        };

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let index: number;
          while ((index = buffer.indexOf("\n")) >= 0) {
            const raw = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (raw) handle(raw);
          }
        }

        if (buffer.trim()) handle(buffer.trim());
        flush();

        // A closed stream without a `done` event means the process died.
        if (!ok && !failure) {
          failure = "The connection closed before the command finished.";
          push(`✗ ${failure}`);
          flush();
          setState((current) =>
            current ? { ...current, status: "error" } : current,
          );
        }
      } catch (err) {
        failure = err instanceof Error ? err.message : "Lost the connection.";
        push(`✗ ${failure}`);
        flush();
        setState((current) =>
          current ? { ...current, status: "error" } : current,
        );
      } finally {
        onFinish?.();
      }

      return { ok, error: terminalError, opened: true };
    },
    [flush, push],
  );

  const close = useCallback(() => {
    if (flushTimer.current !== null) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
    pending.current = [];
    setState(null);
  }, []);

  const isBusy = state?.status === "running";

  const modal = state ? (
    <>
      <div
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          if (!isBusy) close();
        }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      />

      <Dialog
        isOpen
        showCloseButton={false}
        onOpenChange={(open) => {
          if (!open && !isBusy) close();
        }}
        aria-label={state.title}
        className="z-[60] max-w-xl"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span
              className={
                state.status === "running"
                  ? "size-2 shrink-0 animate-pulse rounded-full bg-sky-400"
                  : state.status === "success"
                    ? "size-2 shrink-0 rounded-full bg-emerald-500"
                    : "size-2 shrink-0 rounded-full bg-red-500"
              }
              aria-hidden="true"
            />
            <DialogTitle className="text-base">{state.title}</DialogTitle>
          </div>
          <p className="text-xs text-text-tertiary">
            {state.status === "running"
              ? `${state.subtitle} · ${state.connecting ? "starting…" : "running…"}`
              : state.status === "success"
                ? `${state.subtitle} · finished`
                : `${state.subtitle} · failed`}
          </p>
        </DialogHeader>

        <DialogBody>
          <div
            ref={scrollRef}
            role="log"
            aria-live="polite"
            className="h-60 overflow-y-auto rounded-lg border border-card-border bg-[#0b1220] px-3 py-2 font-mono-tech text-[11px] leading-5"
          >
            {state.lines.length === 0 ? (
              <span className="text-slate-500">
                {state.connecting ? "Starting…" : "Waiting for output…"}
              </span>
            ) : (
              state.lines.map((line, index) => (
                <div key={index} className={lineClass(line)}>
                  {line}
                </div>
              ))
            )}
            {isBusy && (
              <span
                aria-hidden="true"
                className="mt-0.5 inline-block h-3 w-1.5 animate-pulse bg-sky-300"
              />
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={close}
            isDisabled={isBusy}
            className="h-10 px-4"
          >
            {isBusy ? "Running…" : "Close"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  ) : null;

  return { run, close, modal };
}
