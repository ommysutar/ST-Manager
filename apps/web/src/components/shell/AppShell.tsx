"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Toaster } from "sonner";

import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useIsClientMounted } from "@/hooks/useInquiryStorage";

import { Header } from "./Header";
import { Sidebar } from "./Sidebar";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated } = useAuth();
  const mounted = useIsClientMounted();
  const isAuthRoute = pathname === "/login" || pathname.startsWith("/login/");

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (isAuthRoute) {
      if (isAuthenticated) {
        router.replace("/");
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
        {children}
        <Toaster richColors closeButton position="top-right" />
      </ThemeProvider>
    );
  }

  if (!isAuthenticated) {
    return <div className="min-h-screen bg-background" />;
  }

  return (
    <ThemeProvider>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 print:overflow-visible print:p-0">{children}</main>
        </div>
      </div>
      <div className="print:hidden" data-print-hide>
        <Toaster richColors closeButton position="top-right" />
      </div>
    </ThemeProvider>
  );
}
