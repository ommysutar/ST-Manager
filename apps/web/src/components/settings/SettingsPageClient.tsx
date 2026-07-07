"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { layout } from "@st-manager/theme";

const settingsLinks = [
  {
    href: "/settings/whatsapp-notifications",
    title: "WhatsApp Notifications",
    description: "Configure one-click WhatsApp message templates for client communication.",
  },
  {
    href: "/settings/files",
    title: "File Management",
    description: "Connect Google Drive, Dropbox, and OneDrive for project file storage.",
  },
  {
    href: "/settings/booking-slots",
    title: "Booking Slot Settings",
    description: "Configure booking time slots, order, and schedules for Week and Month views.",
  },
  {
    href: "/settings/studios",
    title: "Studios",
    description: "Create and manage studio rooms used for project bookings.",
  },
  {
    href: "/settings/services",
    title: "Service Management",
    description: "Manage studio services and pricing for the inquiry wizard.",
  },
  {
    href: "/settings/template",
    title: "Invoice & Quotation Template",
    description: "Owner branding, bank/UPI details, and terms used on every document.",
  },
];

export function SettingsPageClient() {
  const { isAuthenticated } = useAuth();
  const { canAccessSettings } = usePermissions();

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to access settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessSettings()) {
    return (
      <AccessDenied message="Only the studio owner can access settings." />
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Owner panel configuration.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {settingsLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">{link.title}</CardTitle>
                <CardDescription>{link.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
