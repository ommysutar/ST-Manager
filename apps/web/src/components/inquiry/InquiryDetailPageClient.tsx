"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Separator } from "@st-manager/ui";
import { FileTextIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import { QuotationSummary } from "@/components/inquiry/wizard/QuotationSummary";
import { useAuth } from "@/hooks/useAuth";
import { useInquiry } from "@/hooks/useInquiryStorage";
import { formatINR } from "@/lib/currency";
import { getOrCreateQuotation } from "@/lib/documents/storage";
import { layout } from "@st-manager/theme";

export function InquiryDetailPageClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const inquiry = useInquiry(params.id);

  function handleMakeQuotation() {
    if (!inquiry) {
      return;
    }
    const document = getOrCreateQuotation({ inquiryId: inquiry.id, projectId: inquiry.projectId });
    router.push(`/documents/${document.id}`);
  }

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view inquiries.</p>;
  }

  if (!inquiry) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Inquiry not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/inquiries">Back to inquiries</Link>
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
        <Link href="/inquiries" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to inquiries
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{inquiry.form.projectName}</h1>
          <Badge variant={inquiry.status === "project" ? "success" : "secondary"}>
            {inquiry.status === "project" ? "Project" : "Inquiry"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {inquiry.form.clientName} · {inquiry.form.projectCategory}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
          <CardHeader>
            <CardTitle className="text-base">Client &amp; Project</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-muted-foreground">Client</p>
              <p className="font-medium">{inquiry.form.clientName}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Mobile</p>
              <p className="font-medium">{inquiry.form.mobileNumber}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Email</p>
              <p className="font-medium">{inquiry.form.email || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Priority</p>
              <p className="font-medium capitalize">{inquiry.form.priority}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-muted-foreground">Description</p>
              <p className="font-medium">{inquiry.form.projectDescription || "—"}</p>
            </div>
          </CardContent>
        </Card>

        <QuotationSummary
          quotation={inquiry.quotation}
          discountPercent={inquiry.form.studioDiscountPercent}
        />
      </div>

      {inquiry.advanceAmount !== undefined ? (
        <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
          <CardHeader>
            <CardTitle className="text-base">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <p className="text-muted-foreground">Grand Total</p>
              <p className="font-semibold">{formatINR(inquiry.quotation.grandTotal)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Advance Received</p>
              <p className="font-semibold">{formatINR(inquiry.advanceAmount)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Remaining Balance</p>
              <p className="font-semibold">{formatINR(inquiry.remainingBalance ?? 0)}</p>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Separator />

      <div className="flex flex-wrap gap-3">
        {inquiry.projectId ? (
          <Button asChild>
            <Link href={`/projects/${inquiry.projectId}`}>Go To Project</Link>
          </Button>
        ) : (
          <Button asChild>
            <Link href={`/inquiries/new?inquiryId=${inquiry.id}&mode=convert`}>Convert to Project</Link>
          </Button>
        )}
        <Button type="button" variant="outline" onClick={handleMakeQuotation}>
          <FileTextIcon className="size-4" />
          Make Quotation
        </Button>
        <Button asChild variant="outline">
          <Link href="/">Back To Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
