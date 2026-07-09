import { BookingDetailPageClient } from "@/components/bookings/BookingDetailPageClient";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("id");
}

export default function BookingDetailPage() {
  return <BookingDetailPageClient />;
}
