import { ProjectDetailPageClient } from "@/components/projects/ProjectDetailPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default function ProjectDetailPage() {
  return <ProjectDetailPageClient />;
}
