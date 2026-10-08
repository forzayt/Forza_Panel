import Link from "next/link";
import AppShell from "@/components/common/app-shell";
import { Card } from "@/components/tailgrids/core/card";

// MySQL detail stub. Connection management, database/user creation, and
// live status arrive in a later phase — for now, defaults only.
export default function MysqlPage() {
  const details = [
    { label: "Engine", value: "MySQL" },
    { label: "Default host", value: "localhost" },
    { label: "Default port", value: "3306" },
    { label: "Status", value: "Not configured" },
  ];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <Link
            href="/databases"
            className="text-sm font-medium text-text-tertiary hover:text-text-primary"
          >
            ← Databases
          </Link>
          <h1 className="mt-1 mb-1 flex items-center gap-3 text-[28px] leading-8 font-medium text-text-primary">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/10 text-base font-bold text-text-primary">
              M
            </span>
            <span className="font-mono-tech">mysql</span>
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Connection defaults — management arrives in a later phase
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {details.map((d) => (
            <Card key={d.label}>
              <p className="text-[11px] text-text-tertiary">{d.label}</p>
              <p
                className="mt-1 truncate font-mono-tech text-lg font-semibold text-text-primary"
                title={d.value}
              >
                {d.value}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
