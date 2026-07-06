"use client";

import { Badge, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useMemo } from "react";

import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useProjects } from "@/hooks/useProjects";
import { filterActiveProjects } from "@/lib/projects/filters";

export function AssignedTasksWidget() {
  const { user } = useAuth();
  const projects = useProjects();
  const { filterProjects, role } = usePermissions();

  const tasks = useMemo(() => {
    const scoped = filterProjects(filterActiveProjects(projects));
    const items: {
      projectId: string;
      projectName: string;
      taskName: string;
      status: string;
    }[] = [];

    for (const project of scoped) {
      for (const task of project.tasks) {
        if (task.completed) {
          continue;
        }
        if (role === "engineer") {
          const assignee = (task.assignedEngineer ?? project.assignedEngineer).toLowerCase();
          const email = user?.email.toLowerCase() ?? "";
          const local = email.split("@")[0] ?? "";
          if (!assignee.includes(local) && !assignee.includes("engineer")) {
            continue;
          }
        }
        items.push({
          projectId: project.id,
          projectName: project.projectName,
          taskName: task.name,
          status: task.status,
        });
      }
    }

    return items.slice(0, 8);
  }, [projects, filterProjects, role, user?.email]);

  return (
    <Card className="border-border/60 bg-background/60 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-base">
          {role === "engineer" ? "My Assigned Tasks" : "Assigned Tasks"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open tasks right now.</p>
        ) : (
          <ul className="space-y-3">
            {tasks.map((task, index) => (
              <li key={`${task.projectId}-${task.taskName}-${index}`}>
                <Link
                  href={`/projects/${task.projectId}`}
                  className="flex items-start justify-between gap-2 rounded-xl border border-border/60 p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  <div>
                    <p className="font-medium">{task.taskName}</p>
                    <p className="text-sm text-muted-foreground">{task.projectName}</p>
                  </div>
                  <Badge variant="outline">{task.status.replace("_", " ")}</Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
