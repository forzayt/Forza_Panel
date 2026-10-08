import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card } from "@/components/tailgrids/core/card";

interface DatabaseInfo {
  letter: string;
  name: string;
  description: string;
  port: string | null;
}

// Popular engines at a glance. Detection, install, and management
// arrive in a later phase — for now this page is informational only.
const DATABASES: DatabaseInfo[] = [
  {
    letter: "P",
    name: "PostgreSQL",
    description: "Advanced open-source relational database.",
    port: "5432",
  },
  {
    letter: "M",
    name: "MySQL",
    description: "The world's most popular open-source relational database.",
    port: "3306",
  },
  {
    letter: "M",
    name: "MariaDB",
    description: "Community-developed fork of MySQL.",
    port: "3306",
  },
  {
    letter: "R",
    name: "Redis",
    description: "In-memory data store for cache, sessions, and queues.",
    port: "6379",
  },
  {
    letter: "M",
    name: "MongoDB",
    description: "Document-oriented NoSQL database.",
    port: "27017",
  },
  {
    letter: "S",
    name: "SQLite",
    description: "Serverless, embedded SQL database in a single file.",
    port: null,
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
          {DATABASES.map((db) => (
            <Card key={db.name}>
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
              </div>
            </Card>
          ))}
        </div>

        <p className="text-center text-[11px] text-text-tertiary">
          Detection, install, and management arrive in a later phase
        </p>
      </div>
    </AppShell>
  );
}
