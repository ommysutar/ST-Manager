import { ClientEditPageClient } from "@/components/clients/ClientEditPageClient";

export default async function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientEditPageClient clientId={id} />;
}
