import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "./admin";

const execFileAsync = promisify(execFile);

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

function sudoWithPassword(
  password: string,
  args: string[],
  timeout = 600_000,
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("sudo", ["-S", "-p", "", ...args], {
      env: { ...process.env, DEBIAN_FRONTEND: "noninteractive", LC_ALL: "C" },
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
    }, timeout);

    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.once("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.once("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }
      const message = stderr.trim() || `sudo exited with code ${code}`;
      reject(Object.assign(new Error(message), { exitCode: code }));
    });

    // One line only: sudo reads exactly the password from stdin.
    child.stdin.write(`${password}\n`);
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
    await sudoWithPassword(password, ["-k", "true"], 20_000);
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
    if ((err as { exitCode?: number })?.exitCode === undefined) throw err;
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
  return /password is required|a terminal is required|no tty present|not in the sudoers|not allowed to execute|a password is required/i.test(
    message,
  );
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
  options: { timeout?: number } = {},
): Promise<{ stdout: string; stderr: string }> {
  const timeout = options.timeout ?? 600_000;
  const execOptions = {
    timeout,
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, DEBIAN_FRONTEND: "noninteractive", LC_ALL: "C" },
  };

  const helper = helperInstalled() ? PRIV_HELPER : null;

  if (isRoot()) {
    return helper
      ? execFileAsync(helper, args, execOptions)
      : execFileAsync("bash", [REPO_HELPER, ...args], execOptions);
  }

  const unlock = readUnlock(await sessionKey());

  if (helper && unlock) {
    return sudoWithPassword(unlock.password, [helper, ...args], timeout);
  }

  if (helper) {
    try {
      return await execFileAsync("sudo", ["-n", helper, ...args], execOptions);
    } catch (err) {
      if (isSudoAuthFailure(err)) throw new PrivilegeRequiredError();
      throw err;
    }
  }

  if (unlock) {
    return sudoWithPassword(unlock.password, ["bash", REPO_HELPER, ...args], timeout);
  }

  throw new PrivilegeRequiredError();
}
