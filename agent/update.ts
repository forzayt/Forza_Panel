import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.cwd();

export interface PendingCommit {
  hash: string;
  message: string;
  author: string;
}

export interface UpdateStatus {
  ok: boolean;
  upToDate?: boolean;
  branch?: string;
  local?: string;
  behind?: number;
  commits?: PendingCommit[];
  error?: string;
}

async function git(...args: string[]): Promise<string> {
  const { stdout } = await execFileAsync("git", ["-C", ROOT, ...args], {
    timeout: 30000,
  });
  return stdout.trim();
}

export async function getUpdateStatus(): Promise<UpdateStatus> {
  try {
    const branch = await git("branch", "--show-current");
    if (!branch) {
      return { ok: false, error: "Detached HEAD — checkout a branch first." };
    }
    await git("fetch", "origin", branch);
    const local = await git("rev-parse", "HEAD");
    const remote = await git("rev-parse", `origin/${branch}`);
    const short = local.slice(0, 7);
    if (local === remote) {
      return { ok: true, upToDate: true, branch, local: short, behind: 0, commits: [] };
    }
    const behind = Number(await git("rev-list", "--count", `${local}..${remote}`)) || 0;
    const raw = await git(
      "log",
      `${local}..${remote}`,
      "--pretty=format:%h%x00%s%x00%an",
      "-n",
      "10"
    );
    const commits: PendingCommit[] = raw
      ? raw.split("\n").map((line) => {
          const [hash = "", message = "", author = ""] = line.split("\0");
          return { hash, message, author };
        })
      : [];
    return { ok: true, upToDate: false, branch, local: short, behind, commits };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const firstLine = msg.split("\n")[0];
    return { ok: false, error: firstLine.slice(0, 200) };
  }
}

export async function pullUpdate(): Promise<{ ok: true; output: string } | { ok: false; error: string }> {
  try {
    const output = await git("pull", "--ff-only");
    return { ok: true, output: output.slice(-500) };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg.split("\n")[0].slice(0, 300) };
  }
}
