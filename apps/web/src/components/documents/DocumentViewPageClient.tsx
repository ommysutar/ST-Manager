"use client";

import { layout } from "@st-manager/theme";
import { Button, Card, CardContent } from "@st-manager/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DocumentTemplate } from "@/components/documents/DocumentTemplate";
import { ProjectWhatsAppNotify } from "@/components/whatsapp/ProjectWhatsAppNotify";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useProject } from "@/hooks/useProjects";
import { printDocumentPdf } from "@/lib/documents/pdf-filename";
import { getDocument } from "@/lib/documents/storage";
import { buildDocumentViewModel } from "@/lib/documents/view-model";
import { buildDocumentWhatsAppVariables } from "@/lib/whatsapp/context";

export function DocumentViewPageClient() {
  const params = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const profile = useProfile(user);
  const document = getDocument(params.id);
  const project = useProject(document?.projectId ?? "");

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view documents.</p>;
  }

  if (!document) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Document not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/payments">Back to payments</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = buildDocumentViewModel(document, profile);

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Unable to load this document — its source project or inquiry no longer exists.
          </p>
        </CardContent>
      </Card>
    );
  }

  const backHref = document.projectId
    ? `/payments/${document.projectId}`
    : document.inquiryId
      ? `/inquiries/${document.inquiryId}`
      : "/payments";

  return (
    <div
      className="document-page mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="document-toolbar flex items-center justify-between" data-print-hide>
        <Link href={backHref} className="text-sm text-primary underline-offset-4 hover:underline">
          Back
        </Link>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            if (document.type === "quotation" || document.type === "invoice") {
              printDocumentPdf(data.project.projectName, document.type);
            } else {
              window.print();
            }
          }}
        >
          Print / PDF
        </Button>
        {project ? (
          <ProjectWhatsAppNotify
            project={project}
            type={document.type === "invoice" ? "invoice_ready" : "quotation_ready"}
            extras={buildDocumentWhatsAppVariables(project, document, profile)}
            size="sm"
          />
        ) : null}
      </div>

      <div id="document-print-root" className="document-print-root">
        <DocumentTemplate data={data} />
      </div>
    </div>
  );
}
