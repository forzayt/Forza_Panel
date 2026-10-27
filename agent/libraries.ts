import os from "node:os";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export interface LibraryStatus {
  id: string;
  installed: boolean;
  version: string | null;
}

export interface LibrariesStatus {
  platform: string;
  checkedAt: string;
  items: LibraryStatus[];
}

interface Probe {
  id: string;
  bins: string[];
  args: string[];
}

const isWindows = os.platform() === "win32";

// Each stack is "installed" when one of its binaries answers --version on PATH.
// Windows lacks a `python3` alias on most installs, so `py` is tried first.
const PROBES: Probe[] = [
  { id: "node", bins: ["node"], args: ["--version"] },
  {
    id: "python",
    bins: isWindows ? ["py", "python3", "python"] : ["python3", "python"],
    args: ["--version"],
  },
  { id: "java", bins: ["java"], args: ["-version"] },
  { id: "php", bins: ["php"], args: ["--version"] },
  { id: "go", bins: ["go"], args: ["version"] },
  { id: "rust", bins: ["rustc"], args: ["--version"] },
  { id: "ruby", bins: ["ruby"], args: ["--version"] },
  { id: "dotnet", bins: ["dotnet"], args: ["--version"] },
  { id: "mysql", bins: ["mysqld", "mysql"], args: ["--version"] },
  { id: "mariadb", bins: ["mariadbd", "mariadb"], args: ["--version"] },
  { id: "postgresql", bins: ["psql", "postgres"], args: ["--version"] },
  { id: "mongodb", bins: ["mongod", "mongosh"], args: ["--version"] },
  { id: "redis", bins: ["redis-server", "redis-cli"], args: ["--version"] },
  { id: "sqlite", bins: ["sqlite3"], args: ["--version"] },
];

function parseVersion(output: string): string | null {
  // `java -version`, `go version`, `mongod --version` etc. all print the
  // version somewhere in the first line(s); the first x.y[.z] wins.
  const match = output.match(/(\d+\.\d+(?:\.\d+)*)/);
  return match ? match[1] : null;
}

async function probe({ id, bins, args }: Probe): Promise<LibraryStatus> {
  for (const bin of bins) {
    try {
      const { stdout, stderr } = await execFileAsync(bin, args, {
        timeout: 4000,
        windowsHide: true,
        maxBuffer: 1024 * 1024,
      });
      return { id, installed: true, version: parseVersion(`${stdout}\n${stderr}`) };
    } catch {
      // Binary missing or failed — try the next candidate.
    }
  }
  return { id, installed: false, version: null };
}

/** Detects which of the listed stacks are present on this host. */
export async function getLibrariesStatus(): Promise<LibrariesStatus> {
  const items = await Promise.all(PROBES.map(probe));
  return {
    platform: os.platform(),
    checkedAt: new Date().toISOString(),
    items,
  };
}
