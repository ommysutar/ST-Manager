"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";

const ownerSettingsLinks = [
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
] as const;

const teamManagementLink = {
  href: "/settings/team-members",
  title: "Team Members",
  description: "Invite team members, assign roles, and manage workspace access.",
} as const;

export function SettingsPageClient() {
  const { isAuthenticated } = useAuth();
  const { canAccessSettings, canAccessTeamManagement } = usePermissions();

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to access settings.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessSettings() && !canAccessTeamManagement()) {
    return <AccessDenied message="You do not have permission to access settings." />;
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="text-sm text-muted-foreground">
          {canAccessSettings() ? "Owner panel configuration." : "Team management."}
        </p>
      </div>

      <div>
        <h2 className="text-sm font-medium text-muted-foreground">Team Management</h2>
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <Link href={teamManagementLink.href}>
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-base">{teamManagementLink.title}</CardTitle>
                <CardDescription>{teamManagementLink.description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </div>
      </div>

      {canAccessSettings() ? (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Studio Configuration</h2>
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {ownerSettingsLinks.map((link) => (
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
      ) : null}
    </div>
  );
}
