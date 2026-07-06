import { ProjectReportPageClient } from "@/components/reports/ProjectReportPageClient";

export default async function ProjectReportPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  return <ProjectReportPageClient projectId={projectId} />;
}
