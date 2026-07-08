"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Input,
  Progress,
} from "@st-manager/ui";
import { FileTextIcon, ReceiptIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { ReceivePayment, type ReceivePaymentInput } from "@/components/payments/ReceivePayment";
import { ProjectWhatsAppNotify } from "@/components/whatsapp/ProjectWhatsAppNotify";
import { useAuth } from "@/hooks/useAuth";
import { usePaymentsForProject } from "@/hooks/usePayments";
import { useProfile } from "@/hooks/useProfile";
import { useProject } from "@/hooks/useProjects";
import { formatINR } from "@/lib/currency";
import { getOrCreateInvoice, getOrCreateQuotation, getOrCreateReceipt } from "@/lib/documents/storage";
import { addPayment, updateProjectServiceLineAmount, type ServiceLineType } from "@/lib/payments/storage";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";

interface EditableLine {
  key: string;
  type: ServiceLineType;
  lineId: string | null;
  name: string;
  amount: number;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function PaymentOverviewPageClient({ projectId }: { projectId: string }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuth();
  const profile = useProfile(user);
  const project = useProject(projectId);
  const payments = usePaymentsForProject(projectId);
  const [receiveOpen, setReceiveOpen] = useState(false);
  const [editingLine, setEditingLine] = useState<EditableLine | null>(null);
  const [editValue, setEditValue] = useState("");

  const isOwner = user?.role === "owner";

  if (!isAuthenticated) {
    return <p className="text-sm text-muted-foreground">Sign in to view payments.</p>;
  }

  if (!project) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Project not found.</p>
          <Button asChild variant="outline" className="mt-4">
            <Link href="/payments">Back to payments</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const quotation = project.quotation;
  const status = getPaymentStatus(project);
  const receivedAmount = Math.max(0, project.grandTotal - project.remainingBalance);
  const progressPercent = project.grandTotal > 0 ? Math.min(100, Math.round((receivedAmount / project.grandTotal) * 100)) : 0;

  const lines: EditableLine[] = quotation
    ? [
        ...quotation.serviceLines.map((line) => ({
          key: `service-${line.id}`,
          type: "service" as const,
          lineId: line.id,
          name: line.name,
          amount: line.price,
        })),
        ...quotation.customServiceLines.map((line) => ({
          key: `custom-${line.id}`,
          type: "custom" as const,
          lineId: line.id,
          name: `${line.name} (custom)`,
          amount: line.price,
        })),
        ...(quotation.studioRentAmount > 0
          ? [
              {
                key: "rent",
                type: "rent" as const,
                lineId: null,
                name: `Studio Rent (${quotation.studioRentHours}h × ${formatINR(quotation.studioRentRate)})`,
                amount: quotation.studioRentAmount,
              },
            ]
          : []),
      ]
    : [];

  function handleReceive(input: ReceivePaymentInput) {
    addPayment({
      projectId,
      amount: input.amount,
      method: input.method,
      notes: input.notes,
      receivedBy: user?.email ?? "",
      source: "manual",
    });
    toast.success("Payment recorded", { description: `${formatINR(input.amount)} via ${input.method}` });
    setReceiveOpen(false);
  }

  function startEdit(line: EditableLine) {
    setEditingLine(line);
    setEditValue(String(line.amount));
  }

  function saveEdit() {
    if (!editingLine) {
      return;
    }
    const amount = Number(editValue);
    if (!Number.isFinite(amount) || amount < 0) {
      toast.error("Enter a valid amount");
      return;
    }

    updateProjectServiceLineAmount(projectId, editingLine.type, editingLine.lineId, amount);
    toast.success("Amount updated", {
      description: "Project, quotation, invoice, and pending balance are now in sync.",
    });
    setEditingLine(null);
  }

  function handleQuotation() {
    const document = getOrCreateQuotation({ inquiryId: project?.inquiryId, projectId });
    router.push(`/documents/${document.id}`);
  }

  function handleInvoice() {
    const document = getOrCreateInvoice(projectId);
    router.push(`/documents/${document.id}`);
  }

  function handleReceipt(paymentId: string) {
    const document = getOrCreateReceipt(projectId, paymentId);
    router.push(`/documents/${document.id}`);
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div>
        <Link href="/payments" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to payments
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="page-title">{project.projectName}</h1>
          <Badge variant={status === "paid" ? "success" : "secondary"}>{PAYMENT_STATUS_LABELS[status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {project.projectNumber} · {project.clientName} · {project.projectCategory ?? "Project"}
        </p>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardContent className="grid gap-4 pt-6 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">Project Value</p>
            <p className="text-xl font-semibold">{formatINR(project.grandTotal)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Received</p>
            <p className="text-xl font-semibold text-emerald-600 dark:text-emerald-400">
              {formatINR(receivedAmount)}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-xl font-semibold text-amber-600 dark:text-amber-400">
              {formatINR(project.remainingBalance)}
            </p>
          </div>
          <div className="sm:col-span-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment progress</span>
              <span className="font-medium">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} />
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" onClick={() => setReceiveOpen(true)}>
          Receive Payment
        </Button>
        <ProjectWhatsAppNotify project={project} type="payment_reminder" size="sm" />
        <Button type="button" variant="outline" onClick={handleQuotation}>
          <FileTextIcon className="size-4" />
          View / Make Quotation
        </Button>
        <Button type="button" variant="outline" onClick={handleInvoice}>
          <ReceiptIcon className="size-4" />
          View / Generate Invoice
        </Button>
      </div>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader>
          <CardTitle className="text-base">Services</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {lines.length === 0 ? (
            <p className="text-sm text-muted-foreground">No quotation on this project yet.</p>
          ) : (
            lines.map((line) => (
              <div
                key={line.key}
                className="flex items-center justify-between gap-4 rounded-xl border border-border/60 px-4 py-3"
              >
                <span className="text-sm font-medium">{line.name}</span>
                {editingLine?.key === line.key ? (
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      className="h-8 w-28"
                      value={editValue}
                      onChange={(event) => setEditValue(event.target.value)}
                      autoFocus
                    />
                    <Button type="button" size="sm" onClick={saveEdit}>
                      Save
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setEditingLine(null)}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{formatINR(line.amount)}</span>
                    {isOwner ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => startEdit(line)}>
                        Edit
                      </Button>
                    ) : null}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-background/60 backdrop-blur-md dark:bg-background/30">
        <CardHeader>
          <CardTitle className="text-base">Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Date</th>
                    <th className="py-2 pr-4 font-medium">Method</th>
                    <th className="py-2 pr-4 font-medium">Amount</th>
                    <th className="py-2 pr-4 font-medium">Notes</th>
                    <th className="py-2 pr-4 font-medium">Received By</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-border/60">
                      <td className="py-2 pr-4">{formatDateTime(payment.createdAt)}</td>
                      <td className="py-2 pr-4 uppercase">{payment.method}</td>
                      <td className="py-2 pr-4 font-medium">{formatINR(payment.amount)}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{payment.notes || "—"}</td>
                      <td className="py-2 pr-4 text-muted-foreground">{payment.receivedBy || "—"}</td>
                      <td className="py-2">
                        <Badge variant="success">Received</Badge>
                      </td>
                      <td className="py-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => handleReceipt(payment.id)}>
                          Receipt
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={receiveOpen} onOpenChange={setReceiveOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receive Payment</DialogTitle>
            <DialogDescription>Cash is recorded immediately. UPI requires manual verification.</DialogDescription>
          </DialogHeader>
          <ReceivePayment
            amountDue={project.remainingBalance}
            qrDataUrl={profile?.upiQrDataUrl}
            upiId={profile?.upiId}
            onReceive={handleReceive}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
