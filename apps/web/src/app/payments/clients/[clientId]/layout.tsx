import type { ReactNode } from "react";

import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export function generateStaticParams() {
  return staticExportParams("clientId");
}

export default function ClientPaymentsLayout({ children }: { children: ReactNode }) {
  return children;
}
