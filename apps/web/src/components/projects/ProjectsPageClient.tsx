"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  Input,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@st-manager/ui";
import { SearchIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjects } from "@/hooks/useProjects";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import {
  filterActiveProjects,
  filterCompletedProjects,
  filterProjectsBySearch,
} from "@/lib/projects/filters";
import { calculateProjectProgress, getPrimaryEngineer } from "@/lib/projects/progress";
import type { StudioProject } from "@/lib/projects/types";

type ProjectsTab = "active" | "completed";

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function ProjectRow({ project }: { project: StudioProject }) {
  const progress = calculateProjectProgress(project);
  const engineer = getPrimaryEngineer(project);

  return (
    <TableRow>
      <TableCell className="font-mono text-sm">{project.projectNumber}</TableCell>
      <TableCell>
        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
          {project.projectName}
        </Link>
      </TableCell>
      <TableCell>{project.clientName}</TableCell>
      <TableCell className="text-muted-foreground">{project.projectCategory ?? "—"}</TableCell>
      <TableCell>
        <div className="min-w-32 space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {progress.completedCount} / {progress.totalCount} Tasks
            </span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} />
        </div>
      </TableCell>
      <TableCell>
        <Badge variant={project.status === "active" ? "success" : "secondary"}>
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
        </Badge>
      </TableCell>
      <TableCell>{engineer}</TableCell>
      <TableCell className="text-muted-foreground">{formatUpdatedAt(project.updatedAt)}</TableCell>
    </TableRow>
  );
}

function ProjectMobileCard({ project }: { project: StudioProject }) {
  const progress = calculateProjectProgress(project);
  const engineer = getPrimaryEngineer(project);

  return (
    <Card className="border-border/60">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-xs text-muted-foreground">{project.projectNumber}</p>
            <Link href={`/projects/${project.id}`} className="mt-1 block font-medium hover:underline">
              {project.projectName}
            </Link>
          </div>
          <Badge variant={project.status === "active" ? "success" : "secondary"}>
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </Badge>
        </div>

        <dl className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Client</dt>
            <dd className="truncate">{project.clientName}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Engineer</dt>
            <dd className="truncate">{engineer}</dd>
          </div>
          <div className="col-span-2">
            <dt className="text-xs text-muted-foreground">Category</dt>
            <dd>{project.projectCategory ?? "—"}</dd>
          </div>
        </dl>

        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              {progress.completedCount} / {progress.totalCount} Tasks
            </span>
            <span>{progress.percent}%</span>
          </div>
          <Progress value={progress.percent} />
        </div>

        <p className="text-xs text-muted-foreground">Updated {formatUpdatedAt(project.updatedAt)}</p>
      </CardContent>
    </Card>
  );
}

export function ProjectsPageClient() {
  const { isAuthenticated } = useAuth();
  const projects = useProjects();
  const { filterProjects, role } = usePermissions();
  const [tab, setTab] = useState<ProjectsTab>("active");
  const [query, setQuery] = useState("");

  const activeProjects = filterProjects(filterActiveProjects(projects));
  const completedProjects = filterProjects(filterCompletedProjects(projects));
  const tabProjects = tab === "active" ? activeProjects : completedProjects;
  const visibleProjects = useMemo(
    () => filterProjectsBySearch(tabProjects, query),
    [tabProjects, query],
  );

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to view projects.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="page-title">Projects</h1>
          <p className="page-description">
            {role === "engineer"
              ? "Projects assigned to you."
              : "Central workspace for all studio production workflows."}
          </p>
        </div>
        {role !== "engineer" ? (
          <Button asChild className="w-full sm:w-auto">
            <Link href="/projects/new">+ New Project</Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "active" ? "default" : "outline"}
            onClick={() => setTab("active")}
            className="flex-1 sm:flex-none"
          >
            Active ({activeProjects.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "completed" ? "default" : "outline"}
            onClick={() => setTab("completed")}
            className="flex-1 sm:flex-none"
          >
            Completed ({completedProjects.length})
          </Button>
        </div>

        <div className="relative w-full">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search number, name, client, category, engineer, status..."
            className="pl-9"
          />
        </div>
      </div>

      {visibleProjects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {query.trim()
              ? "No projects match your search."
              : tab === "active"
                ? "No active projects yet. Create one from the dashboard or convert an inquiry."
                : "No completed projects yet. Projects move here automatically once fully delivered and paid."}
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:hidden">
            {visibleProjects.map((project) => (
              <ProjectMobileCard key={project.id} project={project} />
            ))}
          </div>

          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Project Number</TableHead>
                  <TableHead>Project Name</TableHead>
                  <TableHead>Client Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned Engineer</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleProjects.map((project) => (
                  <ProjectRow key={project.id} project={project} />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
