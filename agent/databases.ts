import fs from "node:fs/promises";
import path from "node:path";

export interface DatabaseRecord {
  name: string;
  engine: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data", "databases");
const META_FILE = "database.json";

// MySQL-compatible identifiers: start with a letter/underscore, then
// letters, numbers, underscores (max 64 chars). Same folder-per-item
// layout as servers: data/databases/<name>/database.json. The engine is
// kept as metadata on the record, not as a folder level.
const NAME_RE = /^[A-Za-z_][A-Za-z0-9_]{0,63}$/;
const ENGINE_RE = /^[a-z0-9][a-z0-9-_]{0,31}$/;

export function isValidDatabaseName(name: string): boolean {
  return NAME_RE.test(name);
}

export function isValidEngine(engine: string): boolean {
  return ENGINE_RE.test(engine);
}

async function readMeta(
  dir: string,
  name: string,
  engine: string
): Promise<DatabaseRecord> {
  try {
    const raw = await fs.readFile(path.join(dir, META_FILE), "utf-8");
    const meta = JSON.parse(raw) as Partial<DatabaseRecord>;
    return {
      name,
      engine,
      createdAt:
        typeof meta.createdAt === "string" ? meta.createdAt : new Date(0).toISOString(),
    };
  } catch {
    // Folder exists without metadata — synthesize a record.
    return { name, engine, createdAt: new Date(0).toISOString() };
  }
}

export async function getDatabase(
  engine: string,
  name: string
): Promise<DatabaseRecord | null> {
  if (!isValidEngine(engine) || !isValidDatabaseName(name)) return null;
  try {
    const stat = await fs.stat(path.join(DATA_DIR, name));
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }
  return readMeta(path.join(DATA_DIR, name), name, engine);
}

export async function deleteDatabase(
  engine: string,
  name: string
): Promise<{ ok: true } | { error: string; status: number }> {
  if (!isValidEngine(engine)) {
    return { error: "Invalid engine.", status: 400 };
  }
  if (!isValidDatabaseName(name)) {
    return { error: "Invalid database name.", status: 400 };
  }
  const dir = path.join(DATA_DIR, name);
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      return { error: `"${name}" is not a database folder.`, status: 404 };
    }
  } catch {
    return { error: "Database not found.", status: 404 };
  }
  await fs.rm(dir, { recursive: true, force: true });
  return { ok: true };
}

export async function listDatabases(
  engine: string
): Promise<DatabaseRecord[] | { error: string; status: number }> {
  if (!isValidEngine(engine)) {
    return { error: "Invalid engine.", status: 400 };
  }
  const dir = DATA_DIR;
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    // No databases yet for this engine.
    return [];
  }
  const records: DatabaseRecord[] = [];
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    // Skip strays that could never be valid database names.
    if (!isValidDatabaseName(e.name)) continue;
    records.push(await readMeta(path.join(dir, e.name), e.name, engine));
  }
  records.sort((a, b) => a.name.localeCompare(b.name));
  return records;
}

export async function createDatabase(
  engine: string,
  name: string
): Promise<{ record: DatabaseRecord } | { error: string; status: number }> {
  if (!isValidEngine(engine)) {
    return { error: "Invalid engine.", status: 400 };
  }
  const clean = name.trim();
  if (!isValidDatabaseName(clean)) {
    return {
      error:
        "Database name must start with a letter or underscore and contain only letters, numbers, and underscores (max 64 chars).",
      status: 400,
    };
  }
  const dir = path.join(DATA_DIR, clean);
  try {
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      return { error: `Database "${clean}" already exists.`, status: 409 };
    }
    return { error: `"${clean}" already exists and is not a folder.`, status: 409 };
  } catch {
    // Does not exist — safe to create.
  }
  await fs.mkdir(dir, { recursive: true });
  const record: DatabaseRecord = {
    name: clean,
    engine,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { record };
}
