"use client";

import { useParams } from "next/navigation";

import { ClientPaymentsPageClient } from "@/components/payments/ClientPaymentsPageClient";

export default function ClientPaymentsPage() {
  const params = useParams<{ clientId: string }>();
  return <ClientPaymentsPageClient clientId={params.clientId} />;
}
