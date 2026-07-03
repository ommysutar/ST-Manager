import { BookingEditPageClient } from "@/components/calendar/BookingEditPageClient";

export default async function BookingEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BookingEditPageClient bookingId={id} />;
}
