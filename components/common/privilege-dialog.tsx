"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
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

/**
 * One-off "sudo prompt" for privileged actions.
 *
 * The password is verified server-side with `sudo -S -k true`, kept in process
 * memory for 15 minutes (keyed by the admin session), and never returned or
 * persisted. Install `scripts/install-privileges.sh` instead to skip this
 * prompt entirely.
 */
export function usePrivilegeGate(): PrivilegeGate {
  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const resolver = useRef<((unlocked: boolean) => void) | null>(null);

  const askForPassword = useCallback((message?: string | null) => {
    setReason(message ?? null);
    setPassword("");
    setError(null);
    setIsBusy(false);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const settle = useCallback((unlocked: boolean) => {
    const resolve = resolver.current;
    resolver.current = null;
    setIsOpen(false);
    setPassword("");
    setIsBusy(false);
    resolve?.(unlocked);
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
        return;
      }
      settle(true);
    } catch {
      setError("Could not reach the panel — check the connection and retry.");
      setIsBusy(false);
    }
  }, [isBusy, password, settle]);

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

  const dialog = (
    <Dialog
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) settle(false);
      }}
      aria-label="Unlock root access"
      className="max-w-md"
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
          <Input
            id="privilege-password"
            type="password"
            autoComplete="current-password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                unlock();
              }
            }}
            disabled={isBusy}
            state={error ? "error" : "default"}
            placeholder="••••••••"
            className="w-full"
            aria-invalid={error ? true : undefined}
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
          onPress={() => settle(false)}
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
    </Dialog>
  );

  return { request, dialog };
}
