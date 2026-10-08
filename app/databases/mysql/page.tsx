"use client";

import { useState } from "react";
import Link from "next/link";
import AppShell from "@/components/common/app-shell";
import { Button } from "@/components/tailgrids/core/button";
import { Card } from "@/components/tailgrids/core/card";
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

// MySQL UI shell. No connection exists yet, so the list is an empty state
// and Create only explains what's missing — real listing/creation arrives
// with the MySQL connection in a later phase.
export default function MysqlPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dbName, setDbName] = useState("");

  const openCreate = () => {
    setDbName("");
    setIsCreateOpen(true);
  };

  const handleCreate = () => {
    setIsCreateOpen(false);
    toast.info("MySQL is not connected yet — connection arrives in a later phase.");
  };

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
        </div>

        <Card className="p-0">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-card-border px-5 py-4">
            <h2 className="text-sm font-semibold text-text-primary">Databases</h2>
            <Button
              variant="primary"
              appearance="fill"
              onPress={openCreate}
              className="bg-orange-500 text-white hover:bg-orange-400"
            >
              <span aria-hidden="true" className="text-base leading-none">
                +
              </span>
              Create Database
            </Button>
          </div>
          <p className="px-5 py-8 text-center text-sm text-text-tertiary">
            No databases to show yet — connect a MySQL server to list them here.
          </p>
        </Card>
      </div>

      <Dialog
        isOpen={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        aria-label="Create database"
      >
        <DialogHeader>
          <DialogTitle>Create Database</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-1">
            <Label htmlFor="mysql-db-name">Database name</Label>
            <Input
              id="mysql-db-name"
              value={dbName}
              onChange={(e) => setDbName(e.target.value)}
              placeholder="my_database"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              className="w-full font-mono-tech"
            />
            <p className="text-xs text-text-tertiary">
              Requires a MySQL connection — arriving in a later phase.
            </p>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={() => setIsCreateOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            appearance="fill"
            onPress={handleCreate}
            isDisabled={!dbName.trim()}
            className="bg-orange-500 text-white hover:bg-orange-400"
          >
            Create
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
