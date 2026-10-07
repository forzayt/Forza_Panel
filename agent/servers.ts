import fs from "node:fs/promises";
import path from "node:path";
import { getTemplate } from "./templates";

export interface ServerRecord {
  name: string;
  type: string;
  status: "running" | "stopped" | "unknown";
  createdAt: string;
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
    return {
      name,
      type: typeof meta.type === "string" ? meta.type : "Server",
      status: meta.status === "running" || meta.status === "stopped" ? meta.status : "unknown",
      createdAt:
        typeof meta.createdAt === "string" ? meta.createdAt : new Date(0).toISOString(),
    };
  } catch {
    // Folder exists without metadata — synthesize a record.
    return { name, type: "Server", status: "unknown", createdAt: new Date(0).toISOString() };
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
  const dir = path.join(DATA_DIR, serverName);
  // Materialize template folders (entries ending with "/"), skipping traversal.
  for (const entry of template.layout ?? []) {
    if (!entry.endsWith("/")) continue;
    const clean = entry.replace(/\/+$/, "");
    if (!clean || clean.includes("..") || clean.includes("/") || clean.includes("\\")) {
      continue;
    }
    await fs.mkdir(path.join(dir, clean), { recursive: true });
  }
  if (template.serverCfg && template.serverCfg.length > 0) {
    await fs.writeFile(
      path.join(dir, "server.cfg"),
      template.serverCfg.join("\n") + "\n",
      "utf-8"
    );
  }
  const record: ServerRecord = { ...server, type: template.label };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { ok: true, record };
}
