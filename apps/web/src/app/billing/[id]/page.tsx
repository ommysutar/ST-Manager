import { InvoiceDetailPageClient } from "@/components/billing/InvoiceDetailPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default async function BillingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <InvoiceDetailPageClient invoiceId={id} />;
}
