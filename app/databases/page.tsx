import Link from "next/link";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";

interface DatabaseInfo {
  letter: string;
  name: string;
  description: string;
  port: string | null;
  href?: string;
}

// Popular engines at a glance. Detection, install, and management
// arrive in a later phase — for now this page is informational only.
// MySQL only for now — other engines return in a later phase.
const DATABASES: DatabaseInfo[] = [
  {
    letter: "M",
    name: "MySQL",
    description: "The world's most popular open-source relational database.",
    port: "3306",
    href: "/databases/mysql",
  },
];

export default function DatabasesPage() {
  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
            Databases
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Popular database engines at a glance
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {DATABASES.map((db) => {
            const body = (
              <Card className={db.href ? "h-full transition-transform hover:-translate-y-0.5" : undefined}>
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 text-base font-bold text-text-primary">
                    {db.letter}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {db.name}
                    </p>
                    <p className="truncate text-xs text-text-tertiary">
                      {db.description}
                    </p>
                  </div>
                  {db.port ? (
                    <Badge color="gray" size="sm">
                      <span className="font-mono-tech">:{db.port}</span>
                    </Badge>
                  ) : (
                    <Badge color="gray" size="sm">
                      Embedded
                    </Badge>
                  )}
                  {db.href && <span className="shrink-0 text-xs text-text-tertiary">›</span>}
                </div>
              </Card>
            );
            return db.href ? (
              <Link key={db.name} href={db.href} className="block h-full">
                {body}
              </Link>
            ) : (
              <div key={db.name} className="h-full">
                {body}
              </div>
            );
          })}
        </div>

        <p className="text-center text-[11px] text-text-tertiary">
          Detection, install, and management arrive in a later phase
        </p>
      </div>
    </AppShell>
  );
}
