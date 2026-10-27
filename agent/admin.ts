import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface AdminConfig {
  username: string;
  password: string;
}

/**
 * Admin credentials live in `admin.json` at the project root:
 *
 *   { "username": "admin", "password": "secret" }
 *
 * Leaving either field empty means "not configured" — the panel then sends
 * the browser to /login, where the first account can be created.
 */
export const ADMIN_FILE = path.join(process.cwd(), "admin.json");

export const ADMIN_COOKIE = "forzapanel_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const EMPTY_CONFIG: AdminConfig = { username: "", password: "" };

export async function readAdminConfig(): Promise<AdminConfig> {
  try {
    const raw = await fs.readFile(ADMIN_FILE, "utf-8");
    const parsed = JSON.parse(raw) as Partial<AdminConfig> | null;
    return {
      username:
        typeof parsed?.username === "string" ? parsed.username.trim() : EMPTY_CONFIG.username,
      password:
        typeof parsed?.password === "string" ? parsed.password : EMPTY_CONFIG.password,
    };
  } catch {
    // Missing or unreadable file counts as "not configured".
    return { ...EMPTY_CONFIG };
  }
}

export function isAdminConfigured(config: AdminConfig): boolean {
  return config.username.length > 0 && config.password.length > 0;
}

export async function writeAdminConfig(config: AdminConfig): Promise<void> {
  const payload: AdminConfig = {
    username: config.username.trim(),
    password: config.password,
  };
  await fs.writeFile(ADMIN_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
}

export function credentialsMatch(
  config: AdminConfig,
  username: string,
  password: string,
): boolean {
  if (!isAdminConfigured(config)) return false;
  return username.trim() === config.username && password === config.password;
}

/**
 * Session cookie value derived from the credentials, so changing
 * admin.json invalidates existing sessions automatically.
 */
export function sessionToken(config: AdminConfig): string {
  return crypto
    .createHash("sha256")
    .update(`${config.username}\u0000${config.password}\u0000forzapanel-admin-v1`)
    .digest("hex");
}
