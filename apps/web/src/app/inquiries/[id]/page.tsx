import { InquiryDetailPageClient } from "@/components/inquiry/InquiryDetailPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default function InquiryDetailPage() {
  return <InquiryDetailPageClient />;
}
