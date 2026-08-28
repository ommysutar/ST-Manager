"use client";

import { Badge, Button, Card, CardContent, Progress } from "@st-manager/ui";
import { Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ProjectOverviewSections } from "@/components/projects/ProjectOverviewSections";
import { ProjectWhatsAppNotify } from "@/components/whatsapp/ProjectWhatsAppNotify";
import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useProjects";
import { layout } from "@st-manager/theme";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { deleteProjectWithServerSync } from "@/lib/projects/delete-project";
import { isLocalProjectId } from "@/lib/projects/offline-queue";
import { calculateProjectProgress, getPrimaryEngineer } from "@/lib/projects/progress";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProjectDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const project = useProject(params.id);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (!project) return;
    const label = project.projectNumber || project.projectName;
    if (
      !window.confirm(
        `Delete project "${label}"? It will be removed on all devices. Local bookings and payments are not deleted automatically.`,
      )
    ) {
      return;
    }

    setIsDeleting(true);
    try {
      await deleteProjectWithServerSync(project);
      toast.success("Project deleted");
      router.push("/projects");
    } catch {
      toast.error("Failed to delete project");
    } finally {
      setIsDeleting(false);
    }
  }

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

  const progress = calculateProjectProgress(project);

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div>
        <Link href="/projects" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to projects
        </Link>

        <Card className="mt-2 border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
          <CardContent className="space-y-4 pt-6">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="page-title">{project.projectName}</h1>
              <Badge variant={project.status === "active" ? "success" : "secondary"}>
                {PROJECT_STATUS_LABELS[project.status] ?? project.status}
              </Badge>
              <ProjectWhatsAppNotify project={project} type="project_ready" size="sm" />
            </div>

            <div className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-muted-foreground">Project Number</p>
                <p className="font-mono font-medium">{project.projectNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Client</p>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{project.clientName}</p>
                  <ProjectWhatsAppNotify project={project} type="project_ready" size="sm" />
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{project.projectCategory ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned Engineer</p>
                <p className="font-medium">{getPrimaryEngineer(project)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDate(project.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDate(project.updatedAt)}</p>
              </div>
              <div className="sm:col-span-2 lg:col-span-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Overall Progress</span>
                  <span className="font-medium">
                    {progress.percent}% ({progress.completedCount}/{progress.totalCount} tasks)
                  </span>
                </div>
                <Progress value={progress.percent} className="mt-1" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          variant="destructive"
          disabled={isDeleting || isLocalProjectId(project.id)}
          onClick={() => void handleDelete()}
        >
          <Trash2Icon className="size-4" />
          {isDeleting ? "Deleting..." : "Delete project"}
        </Button>
      </div>

      <ProjectOverviewSections project={project} />
    </div>
  );
}
