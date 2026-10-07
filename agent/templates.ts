import fs from "node:fs/promises";
import path from "node:path";

export interface GameTemplate {
  id: string;
  game: string;
  label: string;
  description: string;
  ports?: unknown;
  artifacts?: unknown;
  layout?: string[];
  serverCfg?: string[];
  start?: unknown;
  env?: unknown;
  notes?: string[];
}

export interface TemplateSummary {
  id: string;
  game: string;
  label: string;
  description: string;
}

const TEMPLATE_DIR = path.join(process.cwd(), "template", "game");
const ID_RE = /^[a-z0-9][a-z0-9-_]*$/;

export function isValidTemplateId(id: string): boolean {
  return ID_RE.test(id);
}

export async function listTemplates(): Promise<TemplateSummary[]> {
  await fs.mkdir(TEMPLATE_DIR, { recursive: true });
  const entries = await fs.readdir(TEMPLATE_DIR);
  const out: TemplateSummary[] = [];
  for (const f of entries) {
    if (!f.endsWith(".json")) continue;
    try {
      const raw = await fs.readFile(path.join(TEMPLATE_DIR, f), "utf-8");
      const t = JSON.parse(raw) as Partial<GameTemplate>;
      if (typeof t.id !== "string" || !isValidTemplateId(t.id)) continue;
      out.push({
        id: t.id,
        game: typeof t.game === "string" ? t.game : "",
        label: typeof t.label === "string" ? t.label : t.id,
        description: typeof t.description === "string" ? t.description : "",
      });
    } catch {
      continue;
    }
  }
  out.sort((a, b) => a.label.localeCompare(b.label));
  return out;
}

export async function getTemplate(id: string): Promise<GameTemplate | null> {
  if (!isValidTemplateId(id)) return null;
  try {
    const raw = await fs.readFile(path.join(TEMPLATE_DIR, `${id}.json`), "utf-8");
    const t = JSON.parse(raw) as GameTemplate;
    if (t.id !== id) return null;
    return t;
  } catch {
    return null;
  }
}
