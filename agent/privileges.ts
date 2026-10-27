import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "./admin";

/**
 * Privileged operations (apt installs, service control) run through a small
 * root-owned helper instead of the panel itself:
 *
 *   sudo -n /usr/local/bin/forzapanel-priv <command> [...]
 *
 * The helper only accepts an allowlist (see scripts/forzapanel-priv) and is
 * authorized through /etc/sudoers.d/forzapanel by
 * `scripts/install-privileges.sh` — no password is stored anywhere.
 *
 * Hosts that cannot install the helper can instead "unlock" once from the
 * UI: the sudo password is verified, kept **in this process's memory only**
 * for 15 minutes, and piped to `sudo -S` on demand. It is never written to
 * disk, logged, or returned by an API.
 */
export const PRIV_HELPER = "/usr/local/bin/forzapanel-priv";
export const PRIVILEGE_TTL_MS = 15 * 60 * 1000;

const REPO_HELPER = path.join(process.cwd(), "scripts", "forzapanel-priv");

export class PrivilegeRequiredError extends Error {
  constructor(
    message = "Root access is required. Unlock with your sudo password, or install the helper (sudo bash scripts/install-privileges.sh).",
  ) {
    super(message);
    this.name = "PrivilegeRequiredError";
  }
}

export class PrivilegeDeniedError extends Error {
  constructor(message = "Incorrect sudo password.") {
    super(message);
    this.name = "PrivilegeDeniedError";
  }
}

export function isLinux(): boolean {
  return os.platform() === "linux";
}

export function isRoot(): boolean {
  return typeof process.getuid === "function" && process.getuid() === 0;
}

export function helperInstalled(): boolean {
  if (!isLinux()) return false;
  try {
    fs.accessSync(PRIV_HELPER, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/** Maps privilege failures to an API response payload; null for other errors. */
export function describePrivilegeError(
  err: unknown,
): { error: string; status: number; code?: string } | null {
  if (err instanceof PrivilegeRequiredError) {
    return { error: err.message, status: 403, code: "privilege-required" };
  }
  if (err instanceof PrivilegeDeniedError) {
    return { error: err.message, status: 401, code: "privilege-denied" };
  }
  return null;
}

interface Unlock {
  password: string;
  expiresAt: number;
}

// In-memory only, keyed by a hash of the admin session cookie. A process
// restart, logout, or TTL expiry clears it.
const unlocks = new Map<string, Unlock>();

async function sessionKey(): Promise<string> {
  const store = await cookies();
  const value = store.get(ADMIN_COOKIE)?.value ?? "anonymous";
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readUnlock(key: string): Unlock | null {
  const entry = unlocks.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    unlocks.delete(key);
    return null;
  }
  return entry;
}

export interface PrivilegeStatus {
  platform: string;
  helper: boolean;
  elevated: boolean;
  expiresAt: string | null;
}

export async function getPrivilegeStatus(): Promise<PrivilegeStatus> {
  const unlock = readUnlock(await sessionKey());
  return {
    platform: os.platform(),
    helper: helperInstalled(),
    elevated: isLinux() && (isRoot() || helperInstalled() || unlock !== null),
    expiresAt: unlock ? new Date(unlock.expiresAt).toISOString() : null,
  };
}

/**
 * Cheap pre-flight for streaming endpoints: can we start a privileged command
 * at all? Returns the 403 payload when the UI must ask for a password first,
 * so the error is delivered *before* the response starts streaming.
 */
export async function privilegePreflight(): Promise<{
  error: string;
  status: number;
  code?: string;
} | null> {
  if (!isLinux()) {
    return {
      error: "Privileged actions are only available on Linux hosts.",
      status: 400,
    };
  }
  if (isRoot() || helperInstalled() || readUnlock(await sessionKey())) return null;
  return {
    error: new PrivilegeRequiredError().message,
    status: 403,
    code: "privilege-required",
  };
}

interface SpawnOptions {
  timeout: number;
  /** Called with each complete line of stdout/stderr as it arrives. */
  onLine?: (line: string) => void;
  /** Written to stdin (sudo -S) when set. */
  password?: string;
}

function spawnCapture(
  command: string,
  args: string[],
  options: SpawnOptions,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      env: { ...process.env, DEBIAN_FRONTEND: "noninteractive", LC_ALL: "C" },
    });

    let stdout = "";
    let stderr = "";
    let pending = "";
    let timedOut = false;

    const emit = (chunk: string) => {
      if (!options.onLine) return;
      pending += chunk;
      let index: number;
      while ((index = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, index).replace(/\r$/, "");
        pending = pending.slice(index + 1);
        if (line.trim().length > 0) options.onLine(line);
      }
    };

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeout);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      emit(text);
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      emit(text);
    });

    child.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    child.once("close", (code) => {
      clearTimeout(timer);

      // Flush a trailing line that never got its newline.
      const tail = pending.replace(/\r$/, "");
      if (options.onLine && tail.trim().length > 0) options.onLine(tail);
      pending = "";

      if (timedOut) {
        reject(
          Object.assign(
            new Error(`Command timed out after ${Math.round(options.timeout / 1000)}s.`),
            { exitCode: null },
          ),
        );
        return;
      }
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const message = stderr.trim() || `command exited with code ${code}`;
      reject(Object.assign(new Error(message), { exitCode: code }));
    });

    // One line only: sudo reads exactly the password from stdin.
    child.stdin.on("error", () => {
      // The child can exit before reading stdin (nothing to pipe to); ignore
      // the EPIPE instead of crashing the request.
    });
    if (options.password !== undefined) child.stdin.write(`${options.password}\n`);
    child.stdin.end();
  });
}

/** Verifies the password and keeps it in memory for the session TTL. */
export async function unlockPrivileges(password: string): Promise<{ expiresAt: string }> {
  if (!isLinux()) {
    throw new PrivilegeRequiredError("Privileged actions are only available on Linux hosts.");
  }
  if (!password) {
    throw new PrivilegeDeniedError("Enter the sudo password.");
  }

  try {
    // -k discards any cached timestamp so the password is really checked.
    await spawnCapture("sudo", ["-S", "-p", "", "-k", "true"], {
      timeout: 20_000,
      password,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/not in the sudoers file|is not allowed to execute/i.test(message)) {
      throw new PrivilegeRequiredError(
        "This account cannot use sudo. Run `sudo bash scripts/install-privileges.sh` on the host, then retry.",
      );
    }
    if (/no tty present|a terminal is required|requiretty/i.test(message)) {
      throw new PrivilegeRequiredError(
        "sudo on this host requires a terminal. Install the helper instead: `sudo bash scripts/install-privileges.sh`.",
      );
    }
    if ((err as { exitCode?: number | null })?.exitCode === undefined) throw err;
    throw new PrivilegeDeniedError();
  }

  const key = await sessionKey();
  const expiresAt = Date.now() + PRIVILEGE_TTL_MS;
  unlocks.set(key, { password, expiresAt });
  return { expiresAt: new Date(expiresAt).toISOString() };
}

export async function lockPrivileges(): Promise<void> {
  unlocks.delete(await sessionKey());
}

function isSudoAuthFailure(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /password is required|a terminal is required|no tty present|not in the sudoers|not allowed to execute|no password was provided|incorrect password|sorry, try again/i.test(
    message,
  );
}

/** sudo rejected the password we had cached (rotated password, expired, …). */
function isSudoPasswordRejected(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /incorrect password|sorry, try again|no password was provided|a password is required|password is required/i.test(
    message,
  );
}

export interface RunPrivilegedOptions {
  timeout?: number;
  /** Receives stdout/stderr line by line, for the terminal modal. */
  onLine?: (line: string) => void;
}

/**
 * Runs one allowlisted privileged command. Order of preference:
 *   1. root panel → helper directly (no sudo, no password)
 *   2. installed helper + passwordless sudo → `sudo -n forzapanel-priv …`
 *   3. unlocked password → `sudo -S …` (helper, or the repo script)
 *   4. otherwise → PrivilegeRequiredError (the UI then asks for a password)
 */
export async function runPrivileged(
  args: string[],
  options: RunPrivilegedOptions = {},
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options.timeout ?? 600_000;
  const onLine = options.onLine;
  const helper = helperInstalled() ? PRIV_HELPER : null;

  if (isRoot()) {
    return helper
      ? spawnCapture(helper, args, { timeout, onLine })
      : spawnCapture("bash", [REPO_HELPER, ...args], { timeout, onLine });
  }

  const unlock = readUnlock(await sessionKey());

  if (helper && unlock) {
    try {
      return await spawnCapture("sudo", ["-S", "-p", "", helper, ...args], {
        timeout,
        onLine,
        password: unlock.password,
      });
    } catch (err) {
      if (isSudoPasswordRejected(err)) {
        // Forget the stale password so the next attempt asks again.
        unlocks.delete(await sessionKey());
        throw new PrivilegeDeniedError(
          "sudo rejected the saved password — unlock root access again.",
        );
      }
      throw err;
    }
  }

  if (helper) {
    try {
      return await spawnCapture("sudo", ["-n", helper, ...args], { timeout, onLine });
    } catch (err) {
      if (isSudoAuthFailure(err)) throw new PrivilegeRequiredError();
      throw err;
    }
  }

  if (unlock) {
    try {
      return await spawnCapture("sudo", ["-S", "-p", "", "bash", REPO_HELPER, ...args], {
        timeout,
        onLine,
        password: unlock.password,
      });
    } catch (err) {
      if (isSudoPasswordRejected(err)) {
        unlocks.delete(await sessionKey());
        throw new PrivilegeDeniedError(
          "sudo rejected the saved password — unlock root access again.",
        );
      }
      throw err;
    }
  }

  throw new PrivilegeRequiredError();
}
