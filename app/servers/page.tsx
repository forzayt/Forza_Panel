"use client";

import { useState } from "react";
import AppShell from "@/components/common/app-shell";
import ServicesTable from "@/components/ServicesTable";
import { Button } from "@/components/tailgrids/core/button";
import {
  Dialog,
  DialogBody,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/tailgrids/core/dialog";
import { Input } from "@/components/tailgrids/core/input";
import { Label } from "@/components/tailgrids/core/label";
import { toast } from "sonner";

export default function ServersPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const openDialog = () => {
    setName("");
    setFormError(null);
    setIsDialogOpen(true);
  };

  const handleCreate = async () => {
    const clean = name.trim();
    if (!clean) {
      setFormError("Please enter a server name.");
      return;
    }
    setIsSaving(true);
    setFormError(null);
    try {
      const res = await fetch("/api/servers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: clean }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setFormError(json?.error ?? `Failed to create server (${res.status}).`);
        return;
      }
      setIsDialogOpen(false);
      setRefreshKey((k) => k + 1);
      toast.success(`Server "${clean}" created.`);
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Failed to create server.");
    } finally {
      setIsSaving(false);
    }
  };

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
          <Button variant="primary" appearance="fill" size="md" onPress={openDialog}>
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

        <ServicesTable refreshKey={refreshKey} />
      </div>

      <Dialog
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        aria-label="Add server"
      >
        <DialogHeader>
          <DialogTitle>Add Server</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-2">
            <Label htmlFor="server-name">Server name</Label>
            <Input
              id="server-name"
              className="w-full"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              placeholder="e.g. minecraft"
              autoFocus
            />
            {formError ? (
              <p className="text-sm text-button-error-outline-text">{formError}</p>
            ) : (
              <p className="text-xs text-text-tertiary">
                Letters, numbers, dashes and underscores — a folder is created under
                <span className="font-mono-tech"> data/servers/</span>.
              </p>
            )}
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={() => setIsDialogOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            appearance="fill"
            onPress={handleCreate}
            isDisabled={isSaving}
          >
            {isSaving ? "Creating…" : "Add Server"}
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
