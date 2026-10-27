import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { describePrivilegeError, runPrivileged } from "./privileges";

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

function aptError(
  step: string,
  err: unknown,
): { error: string; status: number; code?: string } {
  // Privilege problems carry a code the UI uses to offer the password prompt.
  const privilege = describePrivilegeError(err);
  if (privilege) return privilege;

  const msg = err instanceof Error ? err.message : String(err);
  const tail = msg.trim().split("\n").filter(Boolean).slice(-3).join(" ");
  return { error: `apt ${step} failed: ${tail.slice(0, 250)}`, status: 500 };
}

/**
 * Install MySQL Server via the privileged helper (Linux only). The helper is
 * authorized through sudoers, so no password is needed; hosts without it can
 * unlock once from the UI and the command runs through `sudo -S`.
 */
export async function installMysql(
  onLog?: (line: string) => void,
): Promise<
  { ok: true; version: string | null } | { error: string; status: number; code?: string }
> {
  if (os.platform() !== "linux") {
    return {
      error: `MySQL install targets Linux — this panel runs on ${os.platform()}.`,
      status: 400,
    };
  }

  onLog?.("$ apt-get update -y");
  try {
    await runPrivileged(["apt-update"], { onLine: onLog });
  } catch (e) {
    return aptError("update", e);
  }

  onLog?.("$ apt-get install -y mysql-server");
  try {
    await runPrivileged(["apt-install", "mysql-server"], { onLine: onLog });
  } catch (e) {
    return aptError("install", e);
  }

  // Best-effort start: systemd may not exist (containers/WSL). Enabling and
  // starting are separate calls because the helper's allowlist has no --now.
  for (const action of ["enable", "start"] as const) {
    onLog?.(`$ systemctl ${action} mysql`);
    try {
      await runPrivileged(["service", action, "mysql"], { onLine: onLog });
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
  onLog?.(`✓ mysql-server installed${status.version ? ` ${status.version}` : ""}`);
  return { ok: true, version: status.version };
}
