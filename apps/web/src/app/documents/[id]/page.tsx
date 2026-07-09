import { DocumentViewPageClient } from "@/components/documents/DocumentViewPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default function DocumentViewPage() {
  return <DocumentViewPageClient />;
}
