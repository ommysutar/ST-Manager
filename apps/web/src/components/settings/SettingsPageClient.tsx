"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { layout } from "@st-manager/theme";

const settingsLinks = [
  {
    href: "/settings/services",
    title: "Service Management",
    description: "Manage studio services and pricing for the inquiry wizard.",
  },
  {
    href: "/settings/projects",
    title: "Project Plans",
    description: "Manage inquiry plan tiers (Basic, Standard, Professional).",
  },
];

export function SettingsPageClient() {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to access settings.</p>
        </CardContent>
      </Card>
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
