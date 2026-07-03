import { Suspense } from "react";

import { SessionCreatePageClient } from "@/components/sessions/SessionCreatePageClient";

export default function SessionCreatePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading…</div>}>
      <SessionCreatePageClient />
    </Suspense>
  );
}
