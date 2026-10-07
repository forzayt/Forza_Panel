"use client";

import AppShell from "@/components/common/app-shell";
import ServicesTable from "@/components/ServicesTable";

export default function ServersPage() {
  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div>
          <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
            Servers
          </h1>
          <p className="text-sm leading-5 text-text-tertiary">
            Manage your servers and running services
          </p>
        </div>

        <ServicesTable />
      </div>
    </AppShell>
  );
}
