"use client";

import { useParams } from "next/navigation";

import { ClientPortalPageClient } from "@/components/client-portal/ClientPortalPageClient";

export function ClientPortalTokenPage() {
  const params = useParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  if (!token || token === "__static__") {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Invalid portal link.</p>
      </div>
    );
  }
  return <ClientPortalPageClient token={token} />;
}
