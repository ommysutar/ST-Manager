import { Button } from "@st-manager/ui";
import { WifiOffIcon } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="page-container flex min-h-[60dvh] flex-col items-center justify-center gap-6 py-12 text-center">
      <div className="flex size-16 items-center justify-center rounded-full bg-muted">
        <WifiOffIcon className="size-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="max-w-md space-y-2">
        <h1 className="page-title">You are offline</h1>
        <p className="page-description">
          ST Manager needs a network connection for live studio data. Cached pages and static assets
          remain available while offline.
        </p>
      </div>
      <Button asChild className="w-full max-w-xs">
        <Link href="/">Return to dashboard</Link>
      </Button>
    </div>
  );
}
