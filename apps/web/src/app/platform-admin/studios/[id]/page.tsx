import { PlatformStudioDetailClient } from "@/components/platform-admin/PlatformStudioDetailClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default function PlatformStudioDetailPage() {
  return <PlatformStudioDetailClient />;
}
