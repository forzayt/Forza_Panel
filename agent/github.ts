import os from "node:os";

export const CHANGELOG_REPO = "forzayt/Forza_Panel";
export const CHANGELOG_BRANCH = "main";

const API_URL = `https://api.github.com/repos/${CHANGELOG_REPO}/commits`;

export interface ChangelogAuthor {
  name: string;
  /** GitHub handle — present when the commit email is linked to an account. */
  login: string | null;
  avatarUrl: string | null;
  /** Profile URL, only when `login` is known. */
  url: string | null;
}

export interface ChangelogCommit {
  sha: string;
  shortSha: string;
  title: string;
  /** Commit message after the first line, without trailing whitespace. */
  body: string | null;
  date: string;
  url: string;
  author: ChangelogAuthor;
}

export interface ChangelogResult {
  repo: string;
  branch: string;
  commits: ChangelogCommit[];
  error: string | null;
}

interface GitHubCommitApi {
  sha: string;
  html_url: string;
  commit: {
    message: string;
    author: { name?: string; email?: string; date?: string } | null;
  };
  author: { login?: string; avatar_url?: string; html_url?: string } | null;
}

function toCommit(entry: GitHubCommitApi): ChangelogCommit {
  const message = entry.commit?.message ?? "";
  const [firstLine, ...rest] = message.split("\n");
  const body = rest.join("\n").trim();

  const login = entry.author?.login ?? null;
  const author: ChangelogAuthor = {
    name: entry.commit?.author?.name ?? login ?? "Unknown author",
    login,
    avatarUrl: entry.author?.avatar_url ?? null,
    url: entry.author?.html_url ?? (login ? `https://github.com/${login}` : null),
  };

  return {
    sha: entry.sha,
    shortSha: entry.sha.slice(0, 7),
    title: firstLine.trim() || "(no commit message)",
    body: body.length > 0 ? body : null,
    date: entry.commit?.author?.date ?? new Date(0).toISOString(),
    url: entry.html_url,
    author,
  };
}

/**
 * Latest commits on main, read from the public GitHub REST API (no token
 * needed, 60 requests/hour per IP). Cached for five minutes and always
 * resolved — the page renders a friendly fallback instead of throwing when
 * GitHub is unreachable or rate limiting.
 */
export async function getRecentCommits(limit = 30): Promise<ChangelogResult> {
  const base: ChangelogResult = {
    repo: CHANGELOG_REPO,
    branch: CHANGELOG_BRANCH,
    commits: [],
    error: null,
  };

  try {
    const res = await fetch(`${API_URL}?sha=${CHANGELOG_BRANCH}&per_page=${limit}`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": `ForzaPanel (${os.platform()})`,
        "X-GitHub-Api-Version": "2022-11-28",
      },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      const error =
        res.status === 403 || res.status === 429
          ? remaining === "0"
            ? "GitHub's API rate limit was reached — commits will appear again in a few minutes."
            : "GitHub refused the request — try again shortly."
          : `GitHub responded with ${res.status}.`;
      return { ...base, error };
    }

    const data = (await res.json()) as GitHubCommitApi[];
    if (!Array.isArray(data)) {
      return { ...base, error: "Unexpected response from GitHub." };
    }
    return { ...base, commits: data.map(toCommit) };
  } catch {
    return {
      ...base,
      error: "Could not reach GitHub — check the host's internet connection.",
    };
  }
}
