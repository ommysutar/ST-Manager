import { SessionDetailPageClient } from "@/components/sessions/SessionDetailPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SessionDetailPageClient sessionId={id} />;
}
