"use client";

import { Card, CardContent } from "@st-manager/ui";
import Link from "next/link";

import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { layout } from "@st-manager/theme";

export function AccessDenied({
  title = "Access restricted",
  message = "Your role does not have permission to view this page.",
}: {
  title?: string;
  message?: string;
}) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="mx-auto flex flex-col gap-4" style={{ maxWidth: layout.contentMaxWidth }}>
      <Card>
        <CardContent className="space-y-3 pt-6">
          <h1 className="text-lg font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">{message}</p>
          {isAuthenticated ? (
            <Link href="/" className="text-sm text-primary underline-offset-4 hover:underline">
              Back to dashboard
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Sign in with an authorized role.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import type { AppModule } from "@/lib/roles/permissions";

export function RequireModule({
  module,
  children,
}: {
  module: AppModule;
  children: React.ReactNode;
}) {
  const { canAccessModule, role } = usePermissions();

  if (!canAccessModule(module)) {
    return (
      <AccessDenied
        message={`The ${role} role cannot access this module.`}
      />
    );
  }

  return <>{children}</>;
}
