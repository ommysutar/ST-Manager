"use client";

import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from "@st-manager/ui";
import { LICENSE_STATUSES } from "@st-manager/constants";
import type { StudioLicenseDto } from "@st-manager/contracts";
import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { getApiErrorMessage } from "@/lib/api-error";
import { studioLicenseApi } from "@/lib/api-client";
import { ApiError } from "@st-manager/api-sdk";

export function SettingsActivationPageClient() {
  const { isAuthenticated, user } = useAuth();
  const { canAccessSettings } = usePermissions();
  const [license, setLicense] = useState<StudioLicenseDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !canAccessSettings()) {
      return;
    }

    void Promise.resolve()
      .then(() => studioLicenseApi.getCurrent())
      .then((data) => {
        setLicense(data);
        setMissing(false);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.statusCode === 404) {
          setMissing(true);
          return;
        }
        toast.error(getApiErrorMessage(err, "Failed to load license"));
      })
      .finally(() => setLoading(false));
  }, [canAccessSettings, isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to view activation details.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessSettings()) {
    return <AccessDenied message="Only studio owners can view activation details." />;
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div>
        <Button asChild variant="ghost" className="mb-2 px-0">
          <Link href="/settings">← Back to Settings</Link>
        </Button>
        <h1 className="page-title">Activation</h1>
        <p className="text-sm text-muted-foreground">
          Read-only license information for {user?.email}.
        </p>
      </div>

      {loading ? <p className="text-sm text-muted-foreground">Loading license…</p> : null}

      {missing ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">No license on file</CardTitle>
            <CardDescription>
              This studio does not have an activated commercial license yet.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      {license ? (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
            <div>
              <CardTitle className="text-base">Studio License</CardTitle>
              <CardDescription>Verified commercial activation details.</CardDescription>
            </div>
            {license.verified ? (
              <Badge variant="success">Verified</Badge>
            ) : (
              <Badge variant="outline">{license.status}</Badge>
            )}
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <Info label="License Code" value={license.code} mono />
            <Info label="Activation Status" value={license.status} />
            <Info label="License Status" value={license.verified ? "Verified" : license.status} />
            <Info
              label="License Type"
              value={
                license.subscriptionMonths
                  ? `${license.licenseType} (${license.subscriptionMonths} months)`
                  : license.licenseType
              }
            />
            <Info label="Customer" value={license.customerName ?? "—"} />
            <Info label="Activated By" value={license.activatedBy ?? "—"} />
            <Info
              label="Activated On"
              value={
                license.activatedAt ? new Date(license.activatedAt).toLocaleString() : "—"
              }
            />
            <Info
              label="Expiry Date"
              value={
                license.expiresAt
                  ? new Date(license.expiresAt).toLocaleString()
                  : license.licenseType === "LIFETIME"
                    ? "Never"
                    : "—"
              }
            />
            {license.status === LICENSE_STATUSES.REVOKED ? (
              <Info
                label="Revoked"
                value={license.revokedAt ? new Date(license.revokedAt).toLocaleString() : "—"}
              />
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Info({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-muted-foreground">{label}</p>
      <p className={mono ? "font-mono" : undefined}>{value}</p>
    </div>
  );
}
