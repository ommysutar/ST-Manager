"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@st-manager/ui";
import { FileTextIcon, FolderPlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { NewInquiryLink } from "@/components/inquiry/NewInquiryLink";
import { WhatsAppNotifyIcon } from "@/components/whatsapp/WhatsAppNotifyIcon";
import { useAuth } from "@/hooks/useAuth";
import { useClients } from "@/hooks/useClients";
import { useInquiries } from "@/hooks/useInquiryStorage";
import { useProfile } from "@/hooks/useProfile";
import { formatINR } from "@/lib/currency";
import { resolveClientWhatsAppNumber } from "@/hooks/useClientWhatsApp";
import { getOrCreateQuotation } from "@/lib/documents/storage";
import { layout } from "@st-manager/theme";
import { deleteInquiry } from "@/lib/inquiry/storage";
import { buildInquiryWhatsAppVariables } from "@/lib/whatsapp/context";
import type { SavedInquiry } from "@/lib/inquiry/types";

function inquiryStatusLabel(status: "inquiry" | "project"): string {
  return status === "project" ? "Converted" : "Inquiry";
}

export function InquiriesPageClient() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const profile = useProfile(user);
  const clients = useClients();
  const inquiries = useInquiries();

  function handleDelete(inquiryId: string, projectName: string) {
    if (!window.confirm(`Delete inquiry "${projectName || "Untitled"}"? This cannot be undone.`)) {
      return;
    }

    if (deleteInquiry(inquiryId)) {
      toast.success("Inquiry deleted");
      return;
    }

    toast.error("Could not delete inquiry");
  }

  function handleMakeQuotation(inquiry: SavedInquiry) {
    const document = getOrCreateQuotation({ inquiryId: inquiry.id, projectId: inquiry.projectId });
    router.push(`/documents/${document.id}`);
  }

  return (
    <div
      className="mx-auto flex flex-col gap-6"
      style={{ maxWidth: layout.contentMaxWidth }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-title">Inquiries</h1>
          <p className="text-sm text-muted-foreground">
            Saved inquiries from the wizard. Open, convert to project, or delete when no longer needed.
          </p>
        </div>
        <Button asChild>
          <NewInquiryLink>New Inquiry</NewInquiryLink>
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
              <NewInquiryLink>Start New Inquiry</NewInquiryLink>
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
                    {inquiry.inquiryNumber} · {inquiry.form.projectName || "Untitled Project"}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <span>
                      {inquiry.form.clientName} · {inquiry.form.projectCategory || "No category"}
                    </span>
                    <WhatsAppNotifyIcon
                      whatsappNumber={
                        inquiry.form.existingClientId
                          ? resolveClientWhatsAppNumber(inquiry.form.existingClientId, clients)
                          : inquiry.form.whatsappNumber || null
                      }
                      type="inquiry_received"
                      variables={buildInquiryWhatsAppVariables(inquiry, profile)}
                      size="sm"
                    />
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
                    <Link href={`/inquiries/new?inquiryId=${inquiry.id}`}>
                      <PencilIcon className="size-4" />
                      Open Inquiry
                    </Link>
                  </Button>
                  {inquiry.projectId ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/projects/${inquiry.projectId}`}>View Project</Link>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        router.push(`/inquiries/new?inquiryId=${inquiry.id}&mode=convert`)
                      }
                    >
                      <FolderPlusIcon className="size-4" />
                      Convert to Project
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleMakeQuotation(inquiry)}
                  >
                    <FileTextIcon className="size-4" />
                    Make Quotation
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(inquiry.id, inquiry.form.projectName)}
                  >
                    <Trash2Icon className="size-4" />
                    Delete Inquiry
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
