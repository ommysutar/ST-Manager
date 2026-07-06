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
import { useProjects } from "@/hooks/useProjects";
import { layout } from "@st-manager/theme";
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

export function ProjectsPageClient() {
  const { isAuthenticated } = useAuth();
  const projects = useProjects();
  const [tab, setTab] = useState<ProjectsTab>("active");
  const [query, setQuery] = useState("");

  const activeProjects = filterActiveProjects(projects);
  const completedProjects = filterCompletedProjects(projects);
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
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Central workspace for all studio production workflows.
          </p>
        </div>
        <Button asChild>
          <Link href="/projects/new">+ New Project</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={tab === "active" ? "default" : "outline"}
            onClick={() => setTab("active")}
          >
            Active Projects ({activeProjects.length})
          </Button>
          <Button
            type="button"
            size="sm"
            variant={tab === "completed" ? "default" : "outline"}
            onClick={() => setTab("completed")}
          >
            Completed Projects ({completedProjects.length})
          </Button>
        </div>

        <div className="relative w-full max-w-sm">
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
        <div className="overflow-hidden rounded-xl border">
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
      )}
    </div>
  );
}
