import Link from "next/link";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardHeader, CardTitle } from "@/components/tailgrids/core/card";
import { SERVICES } from "@/components/services-data";

export default function ServicesTable() {
  return (
    <div>
      <CardHeader className="mb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-tertiary">🧊</span>
          <CardTitle>Running Services</CardTitle>
        </div>
      </CardHeader>
      <div className="space-y-4">
        {SERVICES.map((s) => (
          <Link
            key={s.name}
            href={`/servers/${s.name}`}
            className="block transition-transform hover:-translate-y-0.5"
          >
            <Card className="flex items-center gap-5 transition-colors hover:border-button-primary-outline-stroke sm:gap-8">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-bold ${s.iconBg}`}
              >
                {s.icon}
              </span>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="truncate font-mono-tech text-sm font-medium text-text-primary">
                  {s.name}
                </p>
                <p className="truncate text-xs text-text-tertiary">{s.type}</p>
              </div>
              <Badge color="success" size="sm" className="hidden shrink-0 sm:inline-flex">
                Running
              </Badge>
              <div className="hidden shrink-0 space-y-1 text-right md:block">
                <p className="font-mono-tech text-xs text-text-primary">{s.cpu} CPU</p>
                <p className="font-mono-tech text-[11px] text-text-tertiary">{s.mem}</p>
              </div>
              <span className="shrink-0 font-mono-tech text-[11px] text-text-tertiary">
                {s.uptime}
              </span>
              <span className="shrink-0 text-text-tertiary">›</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
