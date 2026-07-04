"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { useInquiries } from "@/hooks/useInquiryStorage";
import { formatINR } from "@/lib/currency";
import { layout } from "@st-manager/theme";

function inquiryStatusLabel(status: "inquiry" | "project"): string {
  return status === "project" ? "Project" : "Inquiry";
}

export function InquiriesPageClient() {
  const { isAuthenticated } = useAuth();
  const inquiries = useInquiries();

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Saved inquiries and converted projects from the wizard workflow.
          </p>
        </div>
        <Button asChild>
          <Link href="/inquiries/new">New Inquiry</Link>
        </Button>
      </div>

      {!isAuthenticated ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Sign in to view inquiries.</p>
          </CardContent>
        </Card>
      ) : inquiries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <p className="text-sm text-muted-foreground">No inquiries yet.</p>
            <Button asChild>
              <Link href="/inquiries/new">Start New Inquiry</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {inquiries.map((inquiry) => (
            <Card
              key={inquiry.id}
              className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30"
            >
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div>
                  <CardTitle className="text-base">
                    <Link
                      href={`/inquiries/${inquiry.id}`}
                      className="hover:text-primary hover:underline underline-offset-4"
                    >
                      {inquiry.form.projectName || "Untitled Project"}
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    {inquiry.form.clientName} · {inquiry.form.projectCategory || "No category"}
                  </CardDescription>
                </div>
                <Badge variant={inquiry.status === "project" ? "success" : "secondary"}>
                  {inquiryStatusLabel(inquiry.status)}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                <div className="space-y-1 text-muted-foreground">
                  <p>Quotation: {formatINR(inquiry.quotation.grandTotal)}</p>
                  <p>Updated {new Date(inquiry.updatedAt).toLocaleString()}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/inquiries/${inquiry.id}`}>View details</Link>
                  </Button>
                  {inquiry.projectId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${inquiry.projectId}`}>View Project</Link>
                    </Button>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
