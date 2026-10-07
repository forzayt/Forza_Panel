import fs from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(process.cwd());

// Never expose dependency, build or version-control internals.
const EXCLUDED = new Set(["node_modules", ".next", ".git"]);

export interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
}

export interface FilePreview {
  name: string;
  size: number;
  binary: boolean;
  truncated: boolean;
  content: string;
}

/** Resolve a user-supplied relative path, confined to the repo root. */
function safeJoin(rel: string): string | null {
  const target = path.resolve(ROOT, rel || ".");
  if (target !== ROOT && !target.startsWith(ROOT + path.sep)) return null;
  return target;
}

/** Repo-relative posix-style path for a child entry. */
function toRel(abs: string): string {
  return path.relative(ROOT, abs).split(path.sep).join("/");
}

export async function listDir(rel: string): Promise<{ path: string; entries: FileEntry[] } | null> {
  const abs = safeJoin(rel);
  if (!abs) return null;
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return null;
  }
  if (!stat.isDirectory()) return null;
  const dirents = await fs.readdir(abs, { withFileTypes: true });
  const entries: FileEntry[] = [];
  for (const d of dirents) {
    if (EXCLUDED.has(d.name)) continue;
    const childAbs = path.join(abs, d.name);
    let size = 0;
    let modified = "";
    try {
      const s = await fs.stat(childAbs);
      size = s.isFile() ? s.size : 0;
      modified = s.mtime.toISOString();
    } catch {
      continue;
    }
    entries.push({
      name: d.name,
      path: toRel(childAbs),
      isDirectory: d.isDirectory(),
      size,
      modified,
    });
  }
  entries.sort(
    (a, b) => Number(b.isDirectory) - Number(a.isDirectory) || a.name.localeCompare(b.name)
  );
  return { path: toRel(abs), entries };
}

const PREVIEW_MAX_BYTES = 200 * 1024;

export async function readPreview(rel: string): Promise<FilePreview | null> {
  const abs = safeJoin(rel);
  if (!abs) return null;
  let stat;
  try {
    stat = await fs.stat(abs);
  } catch {
    return null;
  }
  if (!stat.isDirectory() && EXCLUDED.has(path.basename(abs))) return null;
  if (stat.isDirectory()) return null;
  const size = stat.size;
  const fd = await fs.open(abs, "r");
  try {
    const headLen = Math.min(size, 8192);
    const head = Buffer.alloc(headLen);
    await fd.read(head, 0, headLen, 0);
    if (head.includes(0)) {
      return { name: path.basename(abs), size, binary: true, truncated: false, content: "" };
    }
    const len = Math.min(size, PREVIEW_MAX_BYTES);
    const buf = Buffer.alloc(len);
    await fd.read(buf, 0, len, 0);
    return {
      name: path.basename(abs),
      size,
      binary: false,
      truncated: size > PREVIEW_MAX_BYTES,
      content: buf.toString("utf-8"),
    };
  } finally {
    await fd.close();
  }
}
