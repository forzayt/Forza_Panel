import fs from "node:fs/promises";
import path from "node:path";

export interface TemplateInput {
  id: string;
  label: string;
  placeholder?: string;
  help?: string;
  required?: boolean;
  /** JS regex source the value must match (validated server-side). */
  pattern?: string;
  /** Extra CLI arg appended to `start` at launch, with {value} substituted. */
  appendArg?: string;
}

export interface GameTemplate {
  id: string;
  game: string;
  label: string;
  description: string;
  download: string;
  start?: string;
  platforms?: string[];
  inputs?: TemplateInput[];
  /** Lines written to server.cfg at import ({name} = server name). */
  serverCfg?: string[];
}

export interface TemplateSummary {
  id: string;
  game: string;
  label: string;
  description: string;
  inputs: TemplateInput[];
}

const TEMPLATE_DIR = path.join(process.cwd(), "template", "game");
const ID_RE = /^[a-z0-9][a-z0-9-_]*$/;
const INPUT_ID_RE = /^[a-zA-Z][a-zA-Z0-9_-]{0,31}$/;

export function isValidTemplateId(id: string): boolean {
  return ID_RE.test(id);
}

/** Strictly parse server.cfg lines — capped, non-empty strings only. */
export function parseServerCfg(raw: unknown): string[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const out = raw.filter((l): l is string => typeof l === "string" && l.trim() !== "");
  return out.slice(0, 200);
}

/** Strictly parse template inputs — malformed entries are dropped. */
export function parseTemplateInputs(raw: unknown): TemplateInput[] {
  if (!Array.isArray(raw)) return [];
  const out: TemplateInput[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    if (typeof o.id !== "string" || !INPUT_ID_RE.test(o.id)) continue;
    if (typeof o.label !== "string" || !o.label.trim()) continue;
    const input: TemplateInput = { id: o.id, label: o.label.trim() };
    if (typeof o.placeholder === "string") input.placeholder = o.placeholder;
    if (typeof o.help === "string") input.help = o.help;
    if (o.required === true) input.required = true;
    if (typeof o.pattern === "string") {
      try {
        new RegExp(o.pattern);
        input.pattern = o.pattern;
      } catch {
        // Invalid regex — ignore the pattern, keep the input.
      }
    }
    if (typeof o.appendArg === "string" && o.appendArg.includes("{value}")) {
      input.appendArg = o.appendArg;
    }
    out.push(input);
  }
  return out;
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
        inputs: parseTemplateInputs(t.inputs),
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
    t.inputs = parseTemplateInputs(t.inputs);
    t.serverCfg = parseServerCfg(t.serverCfg);
    return t;
  } catch {
    return null;
  }
}
