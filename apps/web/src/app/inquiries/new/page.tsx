import { Suspense } from "react";

import { InquiryWizardPageClient } from "@/components/inquiry/InquiryWizardPageClient";

export default function NewInquiryPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Loading wizard...</p>}>
      <InquiryWizardPageClient />
    </Suspense>
  );
}
