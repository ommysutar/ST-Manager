"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import { CheckCircle2Icon } from "lucide-react";
import Link from "next/link";

import { formatINR } from "@/lib/currency";
import type { StudioProject } from "@/lib/projects/types";

interface SuccessStepProps {
  project: StudioProject;
}

export function SuccessStep({ project }: SuccessStepProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
        <CheckCircle2Icon className="size-10" />
      </div>

      <div className="space-y-2">
        <Badge variant="success">Project Created</Badge>
        <h2 className="page-title">Added Successfully To Project</h2>
        <p className="text-sm text-muted-foreground">
          The inquiry has been converted into a project with advance payment recorded.
        </p>
      </div>

      <Card className="w-full border-border/60 bg-background/60 text-left backdrop-blur-md dark:bg-background/30">
        <CardHeader>
          <CardTitle className="text-base">Project Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Project ID</p>
            <p className="font-medium">{project.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Client Name</p>
            <p className="font-medium">{project.clientName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Project Name</p>
            <p className="font-medium">{project.projectName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Advance Received</p>
            <p className="font-medium">{formatINR(project.advanceReceived)}</p>
          </div>
          <div className="sm:col-span-2">
            <p className="text-muted-foreground">Remaining Balance</p>
            <p className="text-lg font-semibold">{formatINR(project.remainingBalance)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href={`/projects/${project.id}`}>Go To Project</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Back To Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
