import { Suspense } from "react";

import { BookingCreatePageClient } from "@/components/bookings/BookingCreatePageClient";

export default function NewBookingPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading...</p>}>
      <BookingCreatePageClient />
    </Suspense>
  );
}
