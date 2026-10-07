import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { getTemplate } from "./templates";

const execFileAsync = promisify(execFile);

export interface ServerRecord {
  name: string;
  type: string;
  status: "running" | "stopped" | "unknown";
  createdAt: string;
  template?: string;
  pid?: number;
}

const DATA_DIR = path.join(process.cwd(), "data", "servers");
const META_FILE = "server.json";

// Letters, numbers, dashes, underscores. Must start alphanumeric, max 32 chars.
const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9-_]{0,31}$/;

export function isValidServerName(name: string): boolean {
  return NAME_RE.test(name);
}

async function readMeta(dir: string, name: string): Promise<ServerRecord> {
  try {
    const raw = await fs.readFile(path.join(dir, META_FILE), "utf-8");
    const meta = JSON.parse(raw) as Partial<ServerRecord>;
    const record: ServerRecord = {
      name,
      type: typeof meta.type === "string" ? meta.type : "Server",
      status: meta.status === "running" || meta.status === "stopped" ? meta.status : "unknown",
      createdAt:
        typeof meta.createdAt === "string" ? meta.createdAt : new Date(0).toISOString(),
    };
    if (typeof meta.template === "string") record.template = meta.template;
    if (typeof meta.pid === "number") record.pid = meta.pid;
    // Reconcile stale "running" (e.g. panel restarted and pid is gone).
    if (record.status === "running" && !isAlive(record.pid)) {
      record.status = "stopped";
      record.pid = undefined;
      try {
        await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
      } catch {
        // Best-effort only.
      }
    }
    return record;
  } catch {
    // Folder exists without metadata — synthesize a record.
    return { name, type: "Server", status: "unknown", createdAt: new Date(0).toISOString() };
  }
}

// Live processes started by this panel instance.
const procs = new Map<string, number>();

function isAlive(pid?: number): boolean {
  if (!pid) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: unknown) {
    // EPERM means the process exists but we can't signal it.
    return (e as NodeJS.ErrnoException)?.code === "EPERM";
  }
}

export async function listServers(): Promise<ServerRecord[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const records: ServerRecord[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    records.push(await readMeta(path.join(DATA_DIR, e.name), e.name));
  }
  records.sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name)
  );
  return records;
}

export async function deleteServer(
  name: string
): Promise<{ ok: true } | { error: string; status: number }> {
  if (!isValidServerName(name)) {
    return { error: "Invalid server name.", status: 400 };
  }
  const dir = path.join(DATA_DIR, name);
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      return { error: `"${name}" is not a server folder.`, status: 404 };
    }
  } catch {
    return { error: "Server not found.", status: 404 };
  }
  await fs.rm(dir, { recursive: true, force: true });
  return { ok: true };
}

export async function getServer(name: string): Promise<ServerRecord | null> {
  if (!isValidServerName(name)) return null;
  try {
    const stat = await fs.stat(path.join(DATA_DIR, name));
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }
  return readMeta(path.join(DATA_DIR, name), name);
}

export async function createServer(
  name: string
): Promise<{ record: ServerRecord } | { error: string; status: number }> {
  const clean = name.trim();
  if (!isValidServerName(clean)) {
    return {
      error:
        "Server name must start with a letter or number and contain only letters, numbers, dashes or underscores (max 32 chars).",
      status: 400,
    };
  }
  const dir = path.join(DATA_DIR, clean);
  try {
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      return { error: `Server "${clean}" already exists.`, status: 409 };
    }
    return { error: `"${clean}" already exists and is not a folder.`, status: 409 };
  } catch {
    // Does not exist — safe to create.
  }
  await fs.mkdir(dir, { recursive: true });
  const record: ServerRecord = {
    name: clean,
    type: "Server",
    status: "stopped",
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { record };
}

export async function importTemplate(
  serverName: string,
  templateId: string
): Promise<{ ok: true; record: ServerRecord } | { error: string; status: number }> {
  if (!isValidServerName(serverName)) {
    return { error: "Invalid server name.", status: 400 };
  }
  const server = await getServer(serverName);
  if (!server) {
    return { error: "Server not found.", status: 404 };
  }
  const template = await getTemplate(templateId);
  if (!template) {
    return { error: "Template not found.", status: 404 };
  }
  if (!template.download || typeof template.download !== "string") {
    return { error: "Template has no download URL.", status: 400 };
  }
  const dir = path.join(DATA_DIR, serverName);
  await fs.mkdir(dir, { recursive: true });
  await downloadAndExtract(template.download, dir);
  const record: ServerRecord = {
    ...server,
    type: template.label,
    template: template.id,
    status: "stopped",
    pid: undefined,
  };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { ok: true, record };
}

/** Resolve a download URL: direct archive, changelog JSON, or legacy HTML listing. */
async function resolveDownload(url: string): Promise<string> {
  if (/\.(tar\.xz|tar\.gz|tgz)$/i.test(url)) return url;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download source responded ${res.status}.`);
  const text = await res.text();
  // Changelog-style JSON (recommended_download / latest_download).
  try {
    const json = JSON.parse(text) as {
      recommended_download?: unknown;
      latest_download?: unknown;
    };
    const dl = json.recommended_download ?? json.latest_download;
    if (typeof dl === "string" && dl) return dl;
  } catch {
    // Not JSON — fall through to HTML listing.
  }
  const hrefs = [...text.matchAll(/href="([^"]+\.tar\.xz)"/g)].map((m) => m[1]);
  if (hrefs.length === 0) throw new Error("No server archive found at download source.");
  return new URL(hrefs[hrefs.length - 1], url).toString();
}

async function downloadAndExtract(url: string, dir: string): Promise<void> {
  const file = await resolveDownload(url);
  const archivePath = path.join(dir, "server-files.tar.xz");
  const res = await fetch(file);
  if (!res.ok || !res.body) {
    throw new Error(`Download responded ${res.status}.`);
  }
  await pipeline(
    res.body as unknown as NodeJS.ReadableStream,
    fsSync.createWriteStream(archivePath)
  );
  try {
    await execFileAsync("tar", ["-xf", archivePath, "-C", dir]);
  } finally {
    await fs.rm(archivePath, { force: true });
  }
}

export async function startServer(
  name: string
): Promise<{ ok: true; pid: number } | { error: string; status: number }> {
  if (!isValidServerName(name)) {
    return { error: "Invalid server name.", status: 400 };
  }
  const server = await getServer(name);
  if (!server) {
    return { error: "Server not found.", status: 404 };
  }
  const existing = procs.get(name) ?? server.pid;
  if (isAlive(existing)) {
    return { error: `"${name}" is already running.`, status: 409 };
  }
  const template = server.template ? await getTemplate(server.template) : null;
  const cmd = template?.start?.trim();
  if (!cmd) {
    return { error: "No start command — import a template first.", status: 400 };
  }
  const dir = path.join(DATA_DIR, name);
  let child;
  try {
    const logFd = fsSync.openSync(path.join(dir, "server.log"), "a");
    child = spawn(cmd, {
      cwd: dir,
      detached: true,
      shell: true,
      stdio: ["ignore", logFd, logFd],
    });
  } catch (e) {
    return { error: `Failed to start: ${String(e)}`, status: 500 };
  }
  if (!child.pid) {
    return { error: "Failed to start: no process id.", status: 500 };
  }
  child.unref();
  procs.set(name, child.pid);
  const record: ServerRecord = { ...server, status: "running", pid: child.pid };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { ok: true, pid: child.pid };
}

export async function stopServer(
  name: string
): Promise<{ ok: true } | { error: string; status: number }> {
  if (!isValidServerName(name)) {
    return { error: "Invalid server name.", status: 400 };
  }
  const server = await getServer(name);
  if (!server) {
    return { error: "Server not found.", status: 404 };
  }
  const pid = procs.get(name) ?? server.pid;
  procs.delete(name);
  if (isAlive(pid)) {
    try {
      process.kill(pid as number);
    } catch {
      // Already gone — treat as stopped.
    }
  }
  const dir = path.join(DATA_DIR, name);
  const record: ServerRecord = { ...server, status: "stopped", pid: undefined };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { ok: true };
}

export async function readServerLog(name: string, maxLines = 200): Promise<string | null> {
  if (!isValidServerName(name)) return null;
  try {
    const stat = await fs.stat(path.join(DATA_DIR, name));
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }
  let raw: string;
  try {
    raw = await fs.readFile(path.join(DATA_DIR, name, "server.log"), "utf-8");
  } catch {
    return "";
  }
  const lines = raw.split(/\r?\n/);
  // Drop the trailing empty line from a final newline.
  if (lines.length > 0 && lines[lines.length - 1] === "") lines.pop();
  return lines.slice(-maxLines).join("\n");
}
