import { InvoiceDetailPageClient } from "@/components/billing/InvoiceDetailPageClient";

export default async function BillingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetailPageClient invoiceId={id} />;
}
