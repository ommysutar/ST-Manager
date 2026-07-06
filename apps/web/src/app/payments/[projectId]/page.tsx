"use client";

import { useParams } from "next/navigation";

import { PaymentOverviewPageClient } from "@/components/payments/PaymentOverviewPageClient";

export default function PaymentOverviewPage() {
  const params = useParams<{ projectId: string }>();
  return <PaymentOverviewPageClient projectId={params.projectId} />;
}
