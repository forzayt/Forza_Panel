import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export interface AdminConfig {
  username: string;
  password: string;
}

/**
 * Admin credentials live in `admin.json` at the project root. Passwords are
 * stored hashed with scrypt (Node's built-in crypto — no extra dependency):
 *
 *   { "username": "admin", "password": "scrypt$<salt>$<hash>" }
 *
 * A plaintext password written by hand is still accepted for sign-in and is
 * replaced with its hash on the first successful login. Leaving either field
 * empty means "not configured" — the panel then sends the browser to /login,
 * where the first account can be created.
 */
export const ADMIN_FILE = path.join(process.cwd(), "admin.json");

export const ADMIN_COOKIE = "forzapanel_admin";
export const ADMIN_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const EMPTY_CONFIG: AdminConfig = { username: "", password: "" };

const HASH_PREFIX = "scrypt";
const SALT_BYTES = 16;
const KEY_LENGTH = 64;

function scryptAsync(password: string, salt: string, keyLength: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keyLength, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

/** Hashes a password into the `scrypt$<salt>$<hash>` form stored on disk. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${HASH_PREFIX}$${salt}$${hash.toString("hex")}`;
}

export function isHashedPassword(stored: string): boolean {
  return stored.startsWith(`${HASH_PREFIX}$`) && stored.split("$").length === 3;
}

/** Compares an input password against a stored hash (or legacy plaintext). */
export async function verifyPassword(stored: string, password: string): Promise<boolean> {
  if (!stored) return false;

  if (!isHashedPassword(stored)) {
    // Legacy/manual plaintext entry — compare directly.
    return stored === password;
  }

  const [, salt, storedHex] = stored.split("$");
  const expected = Buffer.from(storedHex, "hex");
  if (expected.length === 0) return false;

  const derived = await scryptAsync(password, salt, expected.length);
  return crypto.timingSafeEqual(expected, derived);
}

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

/** Writes the config, hashing the password unless it already is a hash. */
export async function writeAdminConfig(config: AdminConfig): Promise<AdminConfig> {
  const payload: AdminConfig = {
    username: config.username.trim(),
    password: isHashedPassword(config.password)
      ? config.password
      : await hashPassword(config.password),
  };
  await fs.writeFile(ADMIN_FILE, `${JSON.stringify(payload, null, 2)}\n`, "utf-8");
  return payload;
}

export async function credentialsMatch(
  config: AdminConfig,
  username: string,
  password: string,
): Promise<boolean> {
  if (!isAdminConfigured(config)) return false;
  if (username.trim() !== config.username) return false;
  return verifyPassword(config.password, password);
}

/**
 * Session cookie value derived from the stored config, so changing
 * admin.json invalidates existing sessions automatically.
 */
export function sessionToken(config: AdminConfig): string {
  return crypto
    .createHash("sha256")
    .update(`${config.username}\u0000${config.password}\u0000forzapanel-admin-v1`)
    .digest("hex");
}
