"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useIsClientMounted } from "@/hooks/useInquiryStorage";
import { startClientPortalAutoSync } from "@/lib/client-portal/auto-sync";
import { startClientApiSync } from "@/lib/clients/reconcile";

import { Header } from "./Header";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const mounted = useIsClientMounted();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isPlatformAdminRoute = pathname.startsWith("/platform-admin");
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/invite/") ||
    pathname.startsWith("/client/");

  useEffect(() => {
    if (!mounted || !isAuthenticated || isPlatformAdminRoute || isAuthRoute) {
      return;
    }
    const stopPortal = startClientPortalAutoSync();
    const stopClientSync = startClientApiSync();
    return () => {
      stopPortal();
      stopClientSync();
    };
  }, [mounted, isAuthenticated, isPlatformAdminRoute, isAuthRoute]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    // Platform admin uses a completely separate session and shell.
    if (isPlatformAdminRoute) {
      return;
    }

    if (isAuthRoute) {
      const isInviteAcceptRoute =
        pathname === "/invite/accept" || pathname.startsWith("/invite/accept/");
      const isClientPortalRoute = pathname.startsWith("/client/");

      if (isAuthenticated) {
        const hasPendingInvitation =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("invitation");
        // Never redirect away from invitation acceptance or client portal.
        if (!hasPendingInvitation && !isInviteAcceptRoute && !isClientPortalRoute) {
          router.replace("/");
        }
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isAuthRoute, isPlatformAdminRoute, pathname, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isPlatformAdminRoute || isAuthRoute) {
    return (
      <ThemeProvider>
        <div className="safe-area-insets min-h-screen">{children}</div>
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeProvider>
      <div className="safe-area-insets flex min-h-screen min-h-[100dvh] overflow-x-hidden">
        <Sidebar />
        <MobileNavDrawer open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header onMenuClick={() => setMobileNavOpen(true)} />
          <main className="page-main flex-1 overflow-x-hidden overflow-y-auto print:overflow-visible print:p-0">
            {children}
          </main>
        </div>
      </div>
      <div className="print:hidden" data-print-hide>
        <Toaster richColors closeButton position="top-right" />
      </div>
    </ThemeProvider>
  );
}
