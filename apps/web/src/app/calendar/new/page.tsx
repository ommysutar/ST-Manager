import { Suspense } from "react";

import { BookingCreatePageClient } from "@/components/calendar/BookingCreatePageClient";

export default function BookingCreatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <BookingCreatePageClient />
    </Suspense>
  );
}
