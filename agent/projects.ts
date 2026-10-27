import fs from "node:fs/promises";
import path from "node:path";

export interface ProjectRecord {
  name: string;
  description: string;
  createdAt: string;
}

const DATA_DIR = path.join(process.cwd(), "data", "projects");
const META_FILE = "project.json";

// Same rule as servers: the project name *is* the folder name, so it must be
// safe on disk — letters, numbers, dashes, underscores, max 32 chars.
const NAME_RE = /^[a-zA-Z0-9][a-zA-Z0-9-_]{0,31}$/;

export function isValidProjectName(name: string): boolean {
  return NAME_RE.test(name);
}

/** Absolute path of a project folder (caller must validate the name first). */
export function projectDir(name: string): string {
  return path.join(DATA_DIR, name);
}

async function readMeta(dir: string, name: string): Promise<ProjectRecord> {
  try {
    const raw = await fs.readFile(path.join(dir, META_FILE), "utf-8");
    const meta = JSON.parse(raw) as Partial<ProjectRecord>;
    return {
      name,
      description: typeof meta.description === "string" ? meta.description : "",
      createdAt:
        typeof meta.createdAt === "string" ? meta.createdAt : new Date(0).toISOString(),
    };
  } catch {
    // Folder exists without metadata — synthesize a record.
    return { name, description: "", createdAt: new Date(0).toISOString() };
  }
}

export async function listProjects(): Promise<ProjectRecord[]> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  const entries = await fs.readdir(DATA_DIR, { withFileTypes: true });
  const records: ProjectRecord[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    records.push(await readMeta(path.join(DATA_DIR, entry.name), entry.name));
  }
  records.sort(
    (a, b) => b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name)
  );
  return records;
}

export async function getProject(name: string): Promise<ProjectRecord | null> {
  if (!isValidProjectName(name)) return null;
  try {
    const stat = await fs.stat(projectDir(name));
    if (!stat.isDirectory()) return null;
  } catch {
    return null;
  }
  return readMeta(projectDir(name), name);
}

export async function createProject(
  name: string,
  description = ""
): Promise<{ record: ProjectRecord } | { error: string; status: number }> {
  const clean = name.trim();
  if (!isValidProjectName(clean)) {
    return {
      error:
        "Project name must start with a letter or number and contain only letters, numbers, dashes or underscores (max 32 chars).",
      status: 400,
    };
  }
  const dir = projectDir(clean);
  try {
    const stat = await fs.stat(dir);
    if (stat.isDirectory()) {
      return { error: `Project "${clean}" already exists.`, status: 409 };
    }
    return { error: `"${clean}" already exists and is not a folder.`, status: 409 };
  } catch {
    // Does not exist — safe to create.
  }
  await fs.mkdir(dir, { recursive: true });
  const record: ProjectRecord = {
    name: clean,
    description: description.trim(),
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(path.join(dir, META_FILE), JSON.stringify(record, null, 2), "utf-8");
  return { record };
}

export async function deleteProject(
  name: string
): Promise<{ ok: true } | { error: string; status: number }> {
  if (!isValidProjectName(name)) {
    return { error: "Invalid project name.", status: 400 };
  }
  const dir = projectDir(name);
  try {
    const stat = await fs.stat(dir);
    if (!stat.isDirectory()) {
      return { error: `"${name}" is not a project folder.`, status: 404 };
    }
  } catch {
    return { error: "Project not found.", status: 404 };
  }
  await fs.rm(dir, { recursive: true, force: true });
  return { ok: true };
}
