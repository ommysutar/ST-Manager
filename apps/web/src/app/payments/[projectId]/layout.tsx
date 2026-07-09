import type { ReactNode } from "react";

import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("projectId");
}

export default function PaymentOverviewLayout({ children }: { children: ReactNode }) {
  return children;
}
