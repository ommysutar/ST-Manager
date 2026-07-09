"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useIsClientMounted } from "@/hooks/useInquiryStorage";

import { Header } from "./Header";
import { MobileNavDrawer } from "./MobileNavDrawer";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const mounted = useIsClientMounted();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const isAuthRoute =
    pathname === "/login" ||
    pathname.startsWith("/login/") ||
    pathname.startsWith("/invite/");

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (isAuthRoute) {
      if (isAuthenticated) {
        const hasPendingInvitation =
          typeof window !== "undefined" &&
          new URLSearchParams(window.location.search).has("invitation");
        if (!hasPendingInvitation) {
          router.replace("/");
        }
      }
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [mounted, isAuthenticated, isAuthRoute, router]);

  if (!mounted) {
    return <div className="min-h-screen bg-background" />;
  }

  if (isAuthRoute) {
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
