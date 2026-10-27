import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describePrivilegeError, runPrivileged } from "./privileges";

const execFileAsync = promisify(execFile);

export interface LibraryStatus {
  id: string;
  installed: boolean;
  version: string | null;
}

export interface LibrariesStatus {
  platform: string;
  checkedAt: string;
  items: LibraryStatus[];
}

interface Probe {
  id: string;
  bins: string[];
  args: string[];
}

const isWindows = os.platform() === "win32";

// Each stack is "installed" when one of its binaries answers --version on PATH.
// Windows lacks a `python3` alias on most installs, so `py` is tried first.
const PROBES: Probe[] = [
  { id: "node", bins: ["node"], args: ["--version"] },
  {
    id: "python",
    bins: isWindows ? ["py", "python3", "python"] : ["python3", "python"],
    args: ["--version"],
  },
  { id: "java", bins: ["java"], args: ["-version"] },
  { id: "php", bins: ["php"], args: ["--version"] },
  { id: "go", bins: ["go"], args: ["version"] },
  { id: "rust", bins: ["rustc"], args: ["--version"] },
  { id: "ruby", bins: ["ruby"], args: ["--version"] },
  { id: "dotnet", bins: ["dotnet"], args: ["--version"] },
  { id: "mysql", bins: ["mysqld", "mysql"], args: ["--version"] },
  { id: "mariadb", bins: ["mariadbd", "mariadb"], args: ["--version"] },
  { id: "postgresql", bins: ["psql", "postgres"], args: ["--version"] },
  { id: "mongodb", bins: ["mongod", "mongosh"], args: ["--version"] },
  { id: "redis", bins: ["redis-server", "redis-cli"], args: ["--version"] },
  { id: "sqlite", bins: ["sqlite3"], args: ["--version"] },
];

function parseVersion(output: string): string | null {
  // `java -version`, `go version`, `mongod --version` etc. all print the
  // version somewhere in the first line(s); the first x.y[.z] wins.
  const match = output.match(/(\d+\.\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}

async function probe({ id, bins, args }: Probe): Promise<LibraryStatus> {
  for (const bin of bins) {
    try {
      const { stdout, stderr } = await execFileAsync(bin, args, {
        timeout: 4000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      return { id, installed: true, version: parseVersion(`${stdout}\n${stderr}`) };
    } catch {
      // Binary missing or failed — try the next candidate.
    }
  }
  return { id, installed: false, version: null };
}

/** Detects which of the listed stacks are present on this host. */
export async function getLibrariesStatus(): Promise<LibrariesStatus> {
  const items = await Promise.all(PROBES.map(probe));
  return {
    platform: os.platform(),
    checkedAt: new Date().toISOString(),
    items,
  };
}

/** Detects a single stack by id (null when the id is unknown). */
export async function getLibraryStatus(id: string): Promise<LibraryStatus | null> {
  const spec = PROBES.find((entry) => entry.id === id);
  if (!spec) return null;
  return probe(spec);
}

// ---------------------------------------------------------------------------
// Management (Linux + apt): version listing, install/change version, uninstall
// ---------------------------------------------------------------------------

/** apt package backing each stack id. Linux hosts only. */
const APT_PACKAGES: Record<string, string> = {
  node: "nodejs",
  python: "python3",
  java: "default-jdk",
  php: "php-cli",
  go: "golang-go",
  rust: "rustc",
  ruby: "ruby-full",
  dotnet: "dotnet-sdk-8.0",
  mysql: "mysql-server",
  mariadb: "mariadb-server",
  postgresql: "postgresql",
  mongodb: "mongodb-org",
  redis: "redis-server",
  sqlite: "sqlite3",
};

export interface LibraryDetail extends LibraryStatus {
  platform: string;
  /** apt package name, or null when the panel can't manage this stack. */
  package: string | null;
  /** True when install / uninstall / version switch is available here. */
  canManage: boolean;
  /** The apt build currently on disk (may differ in format from `version`). */
  installedPackageVersion: string | null;
  /** Versions apt can install, newest/candidate first. */
  versions: string[];
}

function aptError(
  step: string,
  err: unknown
): { error: string; status: number; code?: string } {
  // Privilege problems carry a code the UI uses to offer the password prompt.
  const privilege = describePrivilegeError(err);
  if (privilege) return privilege;

  const msg = err instanceof Error ? err.message : String(err);
  const tail = msg.trim().split("\n").filter(Boolean).slice(-3).join(" ");
  return { error: `apt ${step} failed: ${tail.slice(0, 250)}`, status: 500 };
}

/** Reads installed + installable versions from `apt-cache policy <pkg>`. */
async function readAptPolicy(
  pkg: string
): Promise<{ installed: string | null; versions: string[] }> {
  let stdout: string;
  try {
    const result = await execFileAsync("apt-cache", ["policy", pkg], {
      timeout: 15_000,
      maxBuffer: 1024 * 1024,
    });
    stdout = result.stdout;
  } catch {
    return { installed: null, versions: [] };
  }

  const installedRaw = stdout.match(/^\s*Installed:\s*(\S+)/m)?.[1];
  const installed = installedRaw && installedRaw !== "(none)" ? installedRaw : null;

  const versions: string[] = [];
  const seen = new Set<string>();
  const push = (value: string | undefined) => {
    if (!value || value === "(none)" || seen.has(value)) return;
    seen.add(value);
    versions.push(value);
  };

  push(installed ?? undefined);
  push(stdout.match(/^\s*Candidate:\s*(\S+)/m)?.[1]);
  for (const match of stdout.matchAll(/^\s*\*{0,3}\s*([^\s*]+)\s+\d+\s*$/gm)) {
    push(match[1]);
  }
  return { installed, versions: versions.slice(0, 20) };
}

/** Status + everything the details modal needs to render its controls. */
export async function getLibraryDetail(id: string): Promise<LibraryDetail | null> {
  const status = await getLibraryStatus(id);
  if (!status) return null;

  const pkg = APT_PACKAGES[id] ?? null;
  const canManage = process.platform === "linux" && pkg !== null;
  const policy =
    canManage && pkg ? await readAptPolicy(pkg) : { installed: null, versions: [] };

  return {
    ...status,
    platform: os.platform(),
    package: pkg,
    canManage,
    installedPackageVersion: policy.installed,
    versions: policy.versions,
  };
}

/**
 * Installs a stack — or switches it to a specific apt version — through the
 * privileged helper (`sudo -n /usr/local/bin/forzapanel-priv …`). Hosts without
 * the helper run the same command through `sudo -S` once the admin has unlocked
 * root access from the UI.
 */
export async function installLibrary(
  id: string,
  version?: string,
  onLog?: (line: string) => void
): Promise<
  | { ok: true; version: string | null }
  | { error: string; status: number; code?: string }
> {
  const pkg = APT_PACKAGES[id];
  if (!pkg) {
    return { error: `"${id}" cannot be managed from the panel.`, status: 400 };
  }
  if (process.platform !== "linux") {
    return {
      error: `Library installs target Linux — this panel runs on ${process.platform}.`,
      status: 400,
    };
  }

  onLog?.("$ apt-get update -y");
  try {
    await runPrivileged(["apt-update"], { onLine: onLog });
  } catch (e) {
    return aptError("update", e);
  }

  // A pinned version goes through the helper's `apt-install <pkg> <version>`
  // path, which adds --allow-downgrades so the dropdown can move a stack back
  // to an older release instead of failing.
  const pinned = version?.trim();
  onLog?.(
    pinned
      ? `$ apt-get install -y --allow-downgrades ${pkg}=${pinned}`
      : `$ apt-get install -y ${pkg}`
  );
  try {
    await runPrivileged(pinned ? ["apt-install", pkg, pinned] : ["apt-install", pkg], {
      onLine: onLog,
    });
  } catch (e) {
    return aptError("install", e);
  }

  onLog?.(`✓ ${pkg} installed`);
  const status = await getLibraryStatus(id);
  if (!status?.installed) {
    return {
      error: "Install finished but no binary for this stack was found on PATH.",
      status: 500,
    };
  }
  return { ok: true, version: status.version };
}

/** Removes a stack's apt package (config files are kept). */
export async function uninstallLibrary(
  id: string,
  onLog?: (line: string) => void
): Promise<{ ok: true } | { error: string; status: number; code?: string }> {
  const pkg = APT_PACKAGES[id];
  if (!pkg) {
    return { error: `"${id}" cannot be managed from the panel.`, status: 400 };
  }
  if (process.platform !== "linux") {
    return {
      error: `Library removal targets Linux — this panel runs on ${process.platform}.`,
      status: 400,
    };
  }

  onLog?.(`$ apt-get remove -y ${pkg}`);
  try {
    await runPrivileged(["apt-remove", pkg], { onLine: onLog });
  } catch (e) {
    return aptError("remove", e);
  }

  onLog?.(`✓ ${pkg} removed`);
  const status = await getLibraryStatus(id);
  if (status?.installed) {
    return {
      error: `Removed ${pkg}, but "${id}" is still on PATH — it may be installed another way.`,
      status: 500,
    };
  }
  return { ok: true };
}
