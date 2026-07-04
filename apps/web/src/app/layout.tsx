import type { Metadata } from "next";

import { AppShell } from "@/components/shell/AppShell";
import "../styles/globals.css";

// Next.js App Router layouts co-export `metadata` with the layout component.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  title: "ST Manager",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
