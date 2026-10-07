"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
import { Card, CardTitle } from "@/components/tailgrids/core/card";
import { getService } from "@/components/services-data";

export default function ServerDetailPage() {
  const params = useParams<{ name: string }>();
  const service = getService(params.name ?? "");

  if (!service) {
    return (
      <AppShell>
        <div className="mt-6 space-y-5 px-2 lg:px-6">
          <Card className="text-center">
            <CardTitle>Server not found</CardTitle>
            <p className="mt-1 text-sm text-text-tertiary">
              No server named{" "}
              <span className="font-mono-tech">{params.name}</span> exists.
            </p>
            <Link
              href="/servers"
              className="mt-4 inline-block text-sm font-medium text-button-primary-outline-text hover:underline"
            >
              ← Back to Servers
            </Link>
          </Card>
        </div>
      </AppShell>
    );
  }

  const details = [
    { label: "Type", value: service.type },
    { label: "CPU", value: service.cpu },
    { label: "Memory", value: service.mem },
    { label: "Uptime", value: service.uptime },
  ];

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <Link
            href="/servers"
            className="text-sm font-medium text-text-tertiary hover:text-text-primary"
          >
            ← Servers
          </Link>
          <h1 className="mt-1 mb-1 flex items-center gap-3 text-[28px] leading-8 font-medium text-text-primary">
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-lg text-base font-bold ${service.iconBg}`}
            >
              {service.icon}
            </span>
            <span className="font-mono-tech">{service.name}</span>
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            {service.type} ·{" "}
            <Badge color="success" size="sm">
              Running
            </Badge>
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {details.map((d) => (
            <Card key={d.label}>
              <p className="text-[11px] text-text-tertiary">{d.label}</p>
              <p className="mt-1 font-mono-tech text-lg font-semibold text-text-primary">
                {d.value}
              </p>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
