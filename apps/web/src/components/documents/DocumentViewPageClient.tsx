"use client";

import { layout } from "@st-manager/theme";
import { Button, Card, CardContent } from "@st-manager/ui";
import Link from "next/link";
import { useParams } from "next/navigation";

import { DocumentTemplate } from "@/components/documents/DocumentTemplate";
import { useAuth } from "@/hooks/useAuth";
import { useDocuments } from "@/hooks/useDocuments";
import { useProfile } from "@/hooks/useProfile";
import { buildDocumentViewModel } from "@/lib/documents/view-model";

export function DocumentViewPageClient() {
  const params = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const profile = useProfile(user);
  const documents = useDocuments();
  const document = documents.find((entry) => entry.id === params.id);

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
    <div className="mx-auto flex flex-col gap-6 print:block" style={{ maxWidth: layout.contentMaxWidth }}>
      <div className="flex items-center justify-between print:hidden">
        <Link href={backHref} className="text-sm text-primary underline-offset-4 hover:underline">
          Back
        </Link>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          Print / PDF
        </Button>
      </div>

      <DocumentTemplate data={data} />
    </div>
  );
}
