import { ClientPortalTokenPage } from "@/components/client-portal/ClientPortalTokenPage";
import { staticExportParams } from "@/lib/static-export";

export const dynamic = "force-static";

export const metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export function generateStaticParams() {
  return staticExportParams("token");
}

export default function ClientProjectPortalPage() {
  return <ClientPortalTokenPage />;
}
