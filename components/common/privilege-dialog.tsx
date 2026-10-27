"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Label } from "@/components/tailgrids/core/label";

/** Shape the privilege API puts on a 403 response. */
const PRIVILEGE_REQUIRED = "privilege-required";

function LockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <rect x="4" y="10" width="16" height="10" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10M12 14v2.5" />
    </svg>
  );
}

export interface PrivilegeRequestResult<T = unknown> {
  res: Response;
  json: T | null;
  /** True when the request was retried after unlocking root access. */
  retried: boolean;
}

export interface PrivilegeGate {
  /**
   * `fetch` wrapper for privileged endpoints: when the API answers
   * `403 { code: "privilege-required" }` it opens the password dialog, waits
   * for the unlock, and replays the exact same request once.
   */
  request: <T = unknown>(
    input: RequestInfo | URL,
    init?: RequestInit,
  ) => Promise<PrivilegeRequestResult<T>>;
  /** Render this once inside the page that uses `request`. */
  dialog: ReactNode;
}

interface Prompt {
  /** Increments per prompt so the field always starts empty. */
  id: number;
  reason: string | null;
}

/**
 * One-off "sudo prompt" for privileged actions.
 *
 * The password is verified server-side with `sudo -S -k true`, kept in process
 * memory for 15 minutes (keyed by the admin session), and never returned or
 * persisted. Install `scripts/install-privileges.sh` instead to skip this
 * prompt entirely.
 */
export function usePrivilegeGate(): PrivilegeGate {
  const [prompt, setPrompt] = useState<Prompt | null>(null);
  const promptSeq = useRef(0);
  const resolver = useRef<((unlocked: boolean) => void) | null>(null);

  const askForPassword = useCallback((reason?: string | null) => {
    promptSeq.current += 1;
    setPrompt({ id: promptSeq.current, reason: reason ?? null });
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((unlocked: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setPrompt(null);
    resolve?.(unlocked);
  }, []);

  const request = useCallback(
    async <T,>(
      input: RequestInfo | URL,
      init?: RequestInit,
    ): Promise<PrivilegeRequestResult<T>> => {
      let res = await fetch(input, init);
      let json = (await res.json().catch(() => null)) as
        | (T & { code?: string; error?: string })
        | null;
      let retried = false;

      if (res.status === 403 && json?.code === PRIVILEGE_REQUIRED) {
        const unlocked = await askForPassword(json.error);
        if (!unlocked) return { res, json, retried };

        retried = true;
        res = await fetch(input, init);
        json = (await res.json().catch(() => null)) as
          | (T & { code?: string; error?: string })
          | null;
      }

      return { res, json, retried };
    },
    [askForPassword],
  );

  const dialog = prompt ? (
    <PrivilegePrompt
      key={prompt.id}
      reason={prompt.reason}
      onResolved={settle}
    />
  ) : null;

  return { request, dialog };
}

/**
 * The password form. Kept as its own component so typing here only re-renders
 * this dialog — not the page (and its search box / list) behind it.
 */
function PrivilegePrompt({
  reason,
  onResolved,
}: {
  reason: string | null;
  onResolved: (unlocked: boolean) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus after the surrounding modal's focus scope settles; autoFocus alone
  // can be undone by the parent dialog.
  useEffect(() => {
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => window.clearTimeout(timer);
  }, []);

  const unlock = useCallback(async () => {
    if (isBusy) return;
    if (!password) {
      setError("Enter the sudo password.");
      return;
    }

    setIsBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/privileges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(json?.error ?? `Could not unlock root access (${res.status}).`);
        setIsBusy(false);
        inputRef.current?.focus();
        return;
      }
      onResolved(true);
    } catch {
      setError("Could not reach the panel — check the connection and retry.");
      setIsBusy(false);
    }
  }, [isBusy, onResolved, password]);

  return (
    <>
      {/* Backdrop: blocks clicks/typing on the page and the dialog behind, so
          focus can never land in (for example) the library search box while a
          password is being entered. RAC's bare Modal has no underlay. */}
      <div
        aria-hidden="true"
        onClick={(e) => {
          e.stopPropagation();
          onResolved(false);
        }}
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      />

      <Dialog
        isOpen
        onOpenChange={(open) => {
          if (!open) onResolved(false);
        }}
        aria-label="Unlock root access"
        className="z-[60] max-w-md"
      >
      <div
        // Keep keystrokes inside this dialog: nothing else on the page (search
        // inputs, shortcuts) should react while a password is being typed.
        onKeyDown={(e) => e.stopPropagation()}
        onKeyUp={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <span className="mb-1 flex size-10 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
            <LockIcon className="size-5" />
          </span>
          <DialogTitle>Root access required</DialogTitle>
          <p className="text-xs leading-5 text-text-tertiary">
            {reason ??
              "This action changes packages or services, so it needs root privileges."}
          </p>
        </DialogHeader>

        <DialogBody className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="privilege-password">Sudo password</Label>
            <input
              ref={inputRef}
              id="privilege-password"
              name="sudo-password"
              type="password"
              autoComplete="current-password"
              autoFocus
              spellCheck={false}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  unlock();
                }
              }}
              disabled={isBusy}
              placeholder="••••••••"
              aria-invalid={error ? true : undefined}
              className="w-full rounded-lg border border-card-border bg-input-background px-4 py-2.5 text-title-50 outline-none duration-300 placeholder:text-input-placeholder-text focus:border-input-primary-focus-border focus:ring-4 focus:ring-input-primary-focus-border/20 disabled:cursor-not-allowed disabled:border-base-100 disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text"
            />
            {error && (
              <p className="text-xs leading-5 text-button-error-outline-text">{error}</p>
            )}
          </div>

          <div className="rounded-lg border border-card-border bg-background-gray-secondary px-3 py-2.5">
            <p className="text-[11px] leading-5 text-text-tertiary">
              Checked by <span className="font-mono-tech">sudo</span> and held in the
              panel&apos;s memory for 15 minutes — never written to disk, cleared on
              logout or restart. Avoid this on plain HTTP. You can remove the prompt
              entirely with{" "}
              <span className="font-mono-tech text-text-secondary">
                sudo bash scripts/install-privileges.sh
              </span>
              .
            </p>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            variant="ghost"
            onPress={() => onResolved(false)}
            isDisabled={isBusy}
            className="h-10 px-4"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            appearance="fill"
            onPress={unlock}
            isDisabled={isBusy || !password}
            className="h-10 px-4"
          >
            {isBusy ? "Verifying…" : "Unlock"}
          </Button>
        </DialogFooter>
      </div>
      </Dialog>
    </>
  );
}
