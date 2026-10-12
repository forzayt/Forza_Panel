import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface MysqlStatus {
  installed: boolean;
  version: string | null;
  platform: string;
}

/** Present when the server binary (or client) answers --version on PATH. */
export async function getMysqlStatus(): Promise<MysqlStatus> {
  const platform = os.platform();
  for (const bin of ["mysqld", "mysql"]) {
    try {
      const { stdout } = await execFileAsync(bin, ["--version"]);
      const match = stdout.match(/(\d+\.\d+\.\d+)/);
      return {
        installed: true,
        version: match ? match[1] : stdout.trim().slice(0, 60),
        platform,
      };
    } catch {
      // Binary missing — try the next one.
    }
  }
  return { installed: false, version: null, platform };
}

function aptError(step: string, err: unknown): { error: string; status: number } {
  const msg = err instanceof Error ? err.message : String(err);
  if (/password is required|no tty present|sudo/i.test(msg)) {
    return {
      error:
        "apt needs privileges: run the panel as root or grant passwordless sudo, then retry.",
      status: 500,
    };
  }
  const tail = msg.trim().split("\n").slice(-3).join(" ");
  return { error: `apt ${step} failed: ${tail.slice(0, 250)}`, status: 500 };
}

/**
 * Install MySQL Server via apt (Linux only). Runs as root when the panel
 * is root, otherwise via non-interactive sudo (fails fast with a clear
 * message instead of hanging on a password prompt).
 */
export async function installMysql(): Promise<
  { ok: true; version: string | null } | { error: string; status: number }
> {
  if (os.platform() !== "linux") {
    return {
      error: `MySQL install targets Linux — this panel runs on ${os.platform()}.`,
      status: 400,
    };
  }
  const isRoot =
    typeof process.getuid === "function" && process.getuid() === 0;
  const run = (args: string[]) =>
    isRoot
      ? execFileAsync("apt-get", args, {
          env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" },
        })
      : execFileAsync("sudo", ["-n", "apt-get", ...args], {
          env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" },
        });

  try {
    await run(["update", "-y"]);
  } catch (e) {
    return aptError("update", e);
  }
  try {
    await run(["install", "-y", "mysql-server"]);
  } catch (e) {
    return aptError("install", e);
  }
  // Best-effort start: systemd may not exist (containers/WSL).
  try {
    if (isRoot) {
      await execFileAsync("systemctl", ["enable", "--now", "mysql"]);
    } else {
      await execFileAsync("sudo", ["-n", "systemctl", "enable", "--now", "mysql"]);
    }
  } catch {
    try {
      if (isRoot) {
        await execFileAsync("service", ["mysql", "start"]);
      } else {
        await execFileAsync("sudo", ["-n", "service", "mysql", "start"]);
      }
    } catch {
      // Leave running-state to the operator; binary presence decides success.
    }
  }

  const status = await getMysqlStatus();
  if (!status.installed) {
    return {
      error: "Install finished but no MySQL binary was found on PATH.",
      status: 500,
    };
  }
  return { ok: true, version: status.version };
}
