"use client";

import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/common/app-shell";
import { Badge } from "@/components/tailgrids/core/badge";
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
import { TextArea } from "@/components/tailgrids/core/text-area";
import { toast } from "sonner";

const STORAGE_KEY = "forzapanel.projects.v1";

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
}

function newId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadProjects(): Project[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Project =>
        !!item &&
        typeof item === "object" &&
        typeof (item as Project).id === "string" &&
        typeof (item as Project).name === "string",
    ).map((item) => ({
      id: item.id,
      name: item.name,
      description: typeof item.description === "string" ? item.description : "",
      createdAt:
        typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString(),
    }));
  } catch {
    return [];
  }
}

function saveProjects(projects: Project[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  } catch {
    // Storage can be full or blocked — the list still works for this session.
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProjectCard({ project, onDelete }: { project: Project; onDelete: () => void }) {
  return (
    <Card className="flex flex-col gap-3 transition-colors hover:border-button-primary-outline-stroke">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-500/10 font-mono-tech text-[13px] font-bold text-brand-500">
          {project.name.trim().charAt(0).toUpperCase() || "P"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-text-primary">{project.name}</p>
          <p className="text-[11px] leading-5 text-text-tertiary">
            Created {formatDate(project.createdAt)}
          </p>
        </div>
        <Button
          variant="danger"
          appearance="ghost"
          size="xs"
          iconOnly
          aria-label={`Delete ${project.name}`}
          title="Delete project"
          onPress={onDelete}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            className="size-4"
          >
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-12M9 7V4h6v3" />
          </svg>
        </Button>
      </div>

      <p className="min-h-10 text-xs leading-5 text-text-secondary">
        {project.description.trim() || "No description yet."}
      </p>
    </Card>
  );
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [query, setQuery] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useEffect(() => {
    setProjects(loadProjects());
    setIsLoaded(true);
  }, []);

  const update = (next: Project[]) => {
    setProjects(next);
    saveProjects(next);
  };

  const openCreate = () => {
    setName("");
    setDescription("");
    setFormError(null);
    setIsCreateOpen(true);
  };

  const handleCreate = () => {
    const clean = name.trim();
    if (!clean) {
      setFormError("Please enter a project name.");
      return;
    }
    if (projects.some((project) => project.name.toLowerCase() === clean.toLowerCase())) {
      setFormError("A project with that name already exists.");
      return;
    }

    const project: Project = {
      id: newId(),
      name: clean,
      description: description.trim(),
      createdAt: new Date().toISOString(),
    };
    update([project, ...projects]);
    setIsCreateOpen(false);
    toast.success(`Project "${clean}" created.`);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    update(projects.filter((project) => project.id !== deleteTarget.id));
    toast.success(`Project "${deleteTarget.name}" deleted.`);
    setDeleteTarget(null);
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((project) =>
      [project.name, project.description].join(" ").toLowerCase().includes(q),
    );
  }, [projects, query]);

  return (
    <AppShell>
      <div className="mt-6 space-y-5 px-2 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="mb-1 text-[28px] leading-8 font-medium text-text-primary">
              Projects
            </h1>
            <p className="text-sm leading-5 text-text-tertiary">
              Group servers, files and configs into a single workspace.
            </p>
          </div>
          <Button variant="primary" appearance="fill" size="md" onPress={openCreate}>
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
            New Project
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="w-full max-w-md">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search projects…"
              aria-label="Search projects"
              className="w-full"
            />
          </div>
          <Badge color="primary" size="sm">
            {isLoaded
              ? `${projects.length} project${projects.length === 1 ? "" : "s"}`
              : "Loading…"}
          </Badge>
        </div>

        {isLoaded && projects.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-500">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
                className="size-6"
              >
                <path d="M3 7a2 2 0 0 1 2-2h3.2a2 2 0 0 1 1.6.8l.8 1.2a2 2 0 0 0 1.6.8H19a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium text-text-primary">No projects yet</p>
              <p className="mt-1 text-xs leading-5 text-text-tertiary">
                Create a project to keep related servers and resources together.
              </p>
            </div>
            <Button variant="primary" appearance="outline" size="sm" onPress={openCreate}>
              Create your first project
            </Button>
          </Card>
        )}

        {isLoaded && projects.length > 0 && visible.length === 0 && (
          <Card>
            <p className="py-4 text-center text-sm text-text-tertiary">
              No projects match “{query.trim()}”.
            </p>
          </Card>
        )}

        {visible.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={() => setDeleteTarget(project)}
              />
            ))}
          </div>
        )}

        {projects.length > 0 && (
          <p className="pt-1 text-center text-[11px] text-text-tertiary">
            Saved in this browser · <span className="font-mono-tech">{STORAGE_KEY}</span>
          </p>
        )}
      </div>

      <Dialog isOpen={isCreateOpen} onOpenChange={setIsCreateOpen} aria-label="New project">
        <DialogHeader>
          <DialogTitle>New Project</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Project name</Label>
              <Input
                id="project-name"
                className="w-full"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                placeholder="e.g. FiveM Roleplay"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Description</Label>
              <TextArea
                id="project-description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project for? (optional)"
              />
            </div>
            {formError && (
              <p className="text-sm text-button-error-outline-text">{formError}</p>
            )}
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
          <Button variant="primary" appearance="fill" onPress={handleCreate}>
            Create Project
          </Button>
        </DialogFooter>
      </Dialog>

      <Dialog
        isOpen={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        aria-label="Delete project"
      >
        <DialogHeader>
          <DialogTitle>Delete project?</DialogTitle>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-text-secondary">
            “{deleteTarget?.name}” will be removed from this browser. This cannot be undone.
          </p>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="primary"
            appearance="outline"
            onPress={() => setDeleteTarget(null)}
          >
            Cancel
          </Button>
          <Button variant="danger" appearance="fill" onPress={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </Dialog>
    </AppShell>
  );
}
