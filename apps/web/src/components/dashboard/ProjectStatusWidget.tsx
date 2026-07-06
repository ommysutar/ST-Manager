"use client";

import { Card, CardContent, CardHeader, CardTitle, Progress } from "@st-manager/ui";
import Link from "next/link";

import { useProjects } from "@/hooks/useProjects";
import {
  calculateProjectProgress,
  getCurrentTaskName,
} from "@/lib/projects/progress";
import { filterActiveProjects } from "@/lib/projects/filters";

export function ProjectStatusWidget() {
  const projects = useProjects();

  const activeProjects = filterActiveProjects(projects).slice(0, 6);

  const incompleteProjects = activeProjects.filter((project) => {
    const progress = calculateProjectProgress(project);
    return progress.percent < 100;
  });

  const displayProjects = (incompleteProjects.length > 0 ? incompleteProjects : activeProjects).slice(
    0,
    5,
  );

  if (displayProjects.length === 0) {
    return (
      <Card className="border-border/60 bg-background/60 backdrop-blur-md">
        <CardHeader>
          <CardTitle className="text-base">Project Status</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No projects yet. Create one to track progress here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">Project Status</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {displayProjects.map((project) => {
          const progress = calculateProjectProgress(project);
          const currentTask = getCurrentTaskName(project.tasks);

          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="block rounded-xl border border-border/60 p-4 transition-colors hover:border-primary/30 hover:bg-primary/5"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{project.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    Currently: {currentTask} · {progress.percent}%
                  </p>
                </div>
                <span className="text-sm font-semibold">{progress.percent}%</span>
              </div>
              <Progress value={progress.percent} className="mt-3 h-2" />
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
