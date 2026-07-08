import type { Metadata, Viewport } from "next";

import { AppShell } from "@/components/shell/AppShell";
import { PwaHeadLinks } from "@/components/pwa/PwaHeadLinks";
import "../styles/globals.css";

const APP_NAME = "ST Manager";
const APP_TITLE = "ST Manager v1.0";
const APP_DESCRIPTION = "Studio Management Software";

// Next.js App Router layouts co-export `metadata` with the layout component.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata: Metadata = {
  applicationName: APP_NAME,
  title: APP_TITLE,
  description: APP_DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: APP_NAME,
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

// eslint-disable-next-line react-refresh/only-export-components
export const viewport: Viewport = {
  themeColor: "#111111",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <PwaHeadLinks />
      </head>
      <body className="safe-area-insets min-h-screen min-h-[100dvh] overflow-x-hidden bg-background text-foreground antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
