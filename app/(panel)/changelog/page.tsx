import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";
import { CHANGELOG_BRANCH, CHANGELOG_REPO, getRecentCommits } from "@/agent/github";

const REPO_URL = `https://github.com/${CHANGELOG_REPO}`;
const COMMITS_URL = `${REPO_URL}/commits/${CHANGELOG_BRANCH}`;

const relativeFormatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

function relativeTime(iso: string): string {
  const timestamp = new Date(iso).getTime();
  if (Number.isNaN(timestamp)) return "unknown date";

  const minutes = Math.round((Date.now() - timestamp) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return relativeFormatter.format(-minutes, "minute");

  const hours = Math.round(minutes / 60);
  if (hours < 24) return relativeFormatter.format(-hours, "hour");

  const days = Math.round(hours / 24);
  if (days < 30) return relativeFormatter.format(-days, "day");

  const months = Math.round(days / 30);
  if (months < 12) return relativeFormatter.format(-months, "month");

  return relativeFormatter.format(-Math.round(months / 12), "year");
}

function GithubMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 .75a11.25 11.25 0 0 0-3.56 21.93c.56.1.77-.24.77-.54v-1.9c-3.13.68-3.79-1.5-3.79-1.5-.51-1.3-1.25-1.65-1.25-1.65-1.02-.7.08-.69.08-.69 1.13.08 1.73 1.16 1.73 1.16 1 1.72 2.63 1.22 3.27.93.1-.73.39-1.22.71-1.5-2.5-.29-5.13-1.25-5.13-5.57 0-1.23.44-2.24 1.16-3.03-.12-.28-.5-1.43.11-2.98 0 0 .94-.3 3.08 1.15a10.7 10.7 0 0 1 5.61 0c2.14-1.45 3.08-1.15 3.08-1.15.61 1.55.23 2.7.11 2.98.72.79 1.16 1.8 1.16 3.03 0 4.33-2.64 5.28-5.15 5.56.4.35.76 1.04.76 2.1v3.11c0 .3.2.65.78.54A11.25 11.25 0 0 0 12 .75Z" />
    </svg>
  );
}

function ExternalIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M7 17 17 7M9 7h8v8" />
    </svg>
  );
}

export default async function ChangelogPage() {
  const { commits, error } = await getRecentCommits(40);
  const latest = commits[0];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <Card className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-28 -right-20 size-64 rounded-full bg-brand-500/10 blur-3xl"
          />
          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
                <GithubMark className="size-6" />
              </span>
              <div className="min-w-0">
                <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
                  Changelog
                </h1>
                <p className="text-sm leading-5 text-text-tertiary">
                  Every commit that absolutely, definitely worked locally.
                </p>
                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  <Badge color="gray" size="sm">
                    <span className="font-mono-tech">{CHANGELOG_REPO}</span>
                  </Badge>
                  <Badge color="primary" size="sm">
                    {CHANGELOG_BRANCH}
                  </Badge>
                  {latest && (
                    <span className="text-[11px] text-text-tertiary">
                      Last commit {relativeTime(latest.date)}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <a
              href={COMMITS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-card-border bg-button-primary-outline-background px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-button-primary-outline-hover-background"
            >
              <GithubMark className="size-4" />
              View on GitHub
              <ExternalIcon className="size-3.5 text-text-tertiary" />
            </a>
          </div>
        </Card>

        {error && (
          <Card className="border-button-error-outline-stroke/40">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-text-primary">Couldn&apos;t load commits</p>
                <p className="mt-1 text-xs leading-5 text-text-tertiary">{error}</p>
              </div>
              <a
                href={COMMITS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-card-border px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-button-primary-outline-hover-background"
              >
                Open on GitHub
                <ExternalIcon className="size-3.5" />
              </a>
            </div>
          </Card>
        )}

        {!error && commits.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-text-tertiary">
              No commits found on {CHANGELOG_BRANCH} yet.
            </p>
          </Card>
        )}

        {commits.length > 0 && (
          <ol className="space-y-3">
            {commits.map((commit, index) => (
              <li key={commit.sha} className="flex gap-3 sm:gap-4">
                <div className="flex w-4 shrink-0 flex-col items-center" aria-hidden="true">
                  <span className="mt-6 size-2.5 shrink-0 rounded-full border-2 border-brand-500 bg-background-white-primary ring-4 ring-brand-500/10" />
                  {index < commits.length - 1 && (
                    <span className="mt-1 w-px flex-1 bg-border-primary" />
                  )}
                </div>

                <Card className="min-w-0 flex-1 p-4 transition-colors hover:border-button-primary-outline-stroke">
                  <div className="flex items-start gap-3">
                    {commit.author.avatarUrl ? (
                      <img
                        src={commit.author.avatarUrl}
                        alt=""
                        width={32}
                        height={32}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="size-8 shrink-0 rounded-full border border-card-border bg-background-gray-secondary"
                      />
                    ) : (
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-500/10 text-xs font-semibold text-brand-500">
                        {commit.author.name.charAt(0).toUpperCase() || "?"}
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-tertiary">
                        {commit.author.url ? (
                          <a
                            href={commit.author.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-medium text-text-secondary transition-colors hover:text-brand-500 hover:underline"
                          >
                            {commit.author.login ?? commit.author.name}
                          </a>
                        ) : (
                          <span className="font-medium text-text-secondary">
                            {commit.author.name}
                          </span>
                        )}
                        <span>committed</span>
                        <span title={new Date(commit.date).toLocaleString()}>
                          {relativeTime(commit.date)}
                        </span>
                      </div>

                      <p className="mt-1.5 text-sm leading-5 font-medium text-text-primary">
                        {commit.title}
                      </p>

                      {commit.body && (
                        <p className="mt-1 line-clamp-4 text-xs leading-5 whitespace-pre-line text-text-tertiary">
                          {commit.body}
                        </p>
                      )}
                    </div>

                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={`View commit ${commit.shortSha}`}
                      className="shrink-0 rounded-md bg-background-gray-secondary px-2 py-1 font-mono-tech text-[11px] text-text-secondary transition-colors hover:bg-tab-active-background hover:text-text-primary"
                    >
                      {commit.shortSha}
                    </a>
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3 border-t border-card-border pt-2.5">
                    <span className="inline-flex items-center gap-1.5 text-[11px] text-text-tertiary">
                      <span className="size-1.5 rounded-full bg-brand-500" aria-hidden="true" />
                      {CHANGELOG_BRANCH}
                    </span>
                    <a
                      href={commit.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-text-secondary transition-colors hover:text-brand-500"
                    >
                      View commit
                      <ExternalIcon className="size-3" />
                    </a>
                  </div>
                </Card>
              </li>
            ))}
          </ol>
        )}

        {commits.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-text-tertiary">
            Showing the latest {commits.length} commits · cached for 5 minutes ·{" "}
            <a
              href={COMMITS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-text-secondary underline-offset-2 hover:text-brand-500 hover:underline"
            >
              view all on GitHub
            </a>
          </p>
        )}
      </div>
    </AppShell>
  );
}
