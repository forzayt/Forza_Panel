"use client";

import AppShell from "@/components/common/app-shell";
import ServicesTable from "@/components/ServicesTable";
import { Button } from "@/components/tailgrids/core/button";
import { toast } from "sonner";

export default function ServersPage() {
  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Servers
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Manage your servers and running services
            </p>
          </div>
          <Button
            variant="primary"
            appearance="fill"
            size="md"
            onPress={() => toast.info("Server provisioning is coming in a later phase.")}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              className="size-4"
            >
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Server
          </Button>
        </div>

        <ServicesTable />
      </div>
    </AppShell>
  );
}
