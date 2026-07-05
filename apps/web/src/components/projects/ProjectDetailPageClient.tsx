"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

import { ProjectTaskFlow } from "@/components/projects/ProjectTaskFlow";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { layout } from "@st-manager/theme";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { calculateProjectProgress, getPrimaryEngineer } from "@/lib/projects/progress";

export function ProjectDetailPageClient() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const project = useProject(params.id);
  const progress = project ? calculateProjectProgress(project) : null;

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view projects.</p>;
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Project not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/projects">Back to projects</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div>
        <Link href="/projects" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to projects
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{project.projectName}</h1>
          <Badge variant={project.status === "active" ? "success" : "secondary"}>
            {PROJECT_STATUS_LABELS[project.status] ?? project.status}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {project.clientName} · {getPrimaryEngineer(project)} ·{" "}
          {project.source === "inquiry" ? "From inquiry" : "Manual project"}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Project Overview</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{project.clientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Engineer</p>
              <p className="font-medium">{getPrimaryEngineer(project)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Progress</p>
              <p className="font-medium">
                {progress?.completedCount} / {progress?.totalCount} tasks ({progress?.percent}%)
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(project.updatedAt).toLocaleString()}</p>
            </div>
            {project.grandTotal > 0 ? (
              <>
                <div>
                  <p className="text-muted-foreground">Grand Total</p>
                  <p className="font-medium">{formatINR(project.grandTotal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Remaining Balance</p>
                  <p className="font-medium">{formatINR(project.remainingBalance)}</p>
                </div>
              </>
            ) : null}
            {project.inquiryId ? (
              <div className="sm:col-span-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/inquiries/${project.inquiryId}`}>View Source Inquiry</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Production Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectTaskFlow project={project} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
