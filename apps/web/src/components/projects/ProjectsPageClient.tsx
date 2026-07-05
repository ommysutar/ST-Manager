"use client";

import { Badge, Button, Card, CardContent, Progress, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@st-manager/ui";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { useProjects } from "@/hooks/useProjects";
import { layout } from "@st-manager/theme";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { calculateProjectProgress, getPrimaryEngineer } from "@/lib/projects/progress";
import type { StudioProject } from "@/lib/projects/types";

function formatUpdatedAt(value: string): string {
  return new Date(value).toLocaleString();
}

function ProjectRow({ project }: { project: StudioProject }) {
  const progress = calculateProjectProgress(project);
  const engineer = getPrimaryEngineer(project);

  return (
    <TableRow>
      <TableCell>
        <Link href={`/projects/${project.id}`} className="font-medium hover:underline">
          {project.projectName}
        </Link>
      </TableCell>
      <TableCell>{project.clientName}</TableCell>
      <TableCell>
        <Badge variant={project.status === "active" ? "success" : "secondary"}>
          {PROJECT_STATUS_LABELS[project.status] ?? project.status}
        </Badge>
      </TableCell>
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
      <TableCell>{engineer}</TableCell>
      <TableCell className="text-muted-foreground">{formatUpdatedAt(project.updatedAt)}</TableCell>
    </TableRow>
  );
}

export function ProjectsPageClient() {
  const { isAuthenticated } = useAuth();
  const projects = useProjects();

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

      {projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            No projects yet. Create one from the dashboard or convert an inquiry.
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project Name</TableHead>
                <TableHead>Client Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Assigned Engineer</TableHead>
                <TableHead>Last Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.map((project) => (
                <ProjectRow key={project.id} project={project} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
