"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useProject } from "@/hooks/useInquiryStorage";
import { formatINR } from "@/lib/currency";
import { layout } from "@st-manager/theme";

export function ProjectDetailPageClient() {
  const params = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const project = useProject(params.id);

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view projects.</p>;
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Project not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/">Back to dashboard</Link>
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
        <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">{project.projectName}</h1>
        <p className="text-sm text-muted-foreground">Project created from inquiry workflow</p>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <CardTitle className="text-base">Project Overview</CardTitle>
          <Badge variant="success">Active</Badge>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground">Project ID</p>
            <p className="font-medium">{project.id}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Inquiry ID</p>
            <p className="font-medium">{project.inquiryId}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Client Name</p>
            <p className="font-medium">{project.clientName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Grand Total</p>
            <p className="font-medium">{formatINR(project.grandTotal)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Advance Received</p>
            <p className="font-medium">{formatINR(project.advanceReceived)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Remaining Balance</p>
            <p className="text-lg font-semibold">{formatINR(project.remainingBalance)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Created</p>
            <p className="font-medium">{new Date(project.createdAt).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={`/inquiries/${project.inquiryId}`}>View Inquiry</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/inquiries">Inquiry Menu</Link>
        </Button>
      </div>
    </div>
  );
}
