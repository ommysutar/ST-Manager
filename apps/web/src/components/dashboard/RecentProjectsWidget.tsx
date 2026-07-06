"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useMemo } from "react";

import { usePermissions } from "@/hooks/usePermissions";
import { useProjects } from "@/hooks/useProjects";
import { filterActiveProjects } from "@/lib/projects/filters";

export function RecentProjectsWidget() {
  const projects = useProjects();
  const { filterProjects } = usePermissions();

  const recent = useMemo(() => {
    return filterProjects(filterActiveProjects(projects))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [projects, filterProjects]);

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">Recent Projects</CardTitle>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground">No active projects yet.</p>
        ) : (
          <ul className="space-y-3">
            {recent.map((project) => (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <p className="font-medium">{project.projectName}</p>
                  <p className="text-sm text-muted-foreground">
                    {project.projectNumber} · {project.clientName}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
