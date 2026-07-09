import { ClientEditPageClient } from "@/components/clients/ClientEditPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default async function ClientEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientEditPageClient clientId={id} />;
}
