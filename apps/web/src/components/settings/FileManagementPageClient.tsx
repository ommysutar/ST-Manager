"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Switch,
} from "@st-manager/ui";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useCloudStorageSettings } from "@/hooks/useCloudStorage";
import { layout } from "@st-manager/theme";
import { updateCloudProviderConfig } from "@/lib/cloud-storage/storage";
import {
  CLOUD_PROVIDER_LABELS,
  type CloudProviderConfig,
  type CloudProviderKey,
} from "@/lib/cloud-storage/types";

type ProviderDraft = Partial<
  Pick<CloudProviderConfig, "enabled" | "folderId" | "clientId" | "clientSecret">
>;

export function FileManagementPageClient() {
  const { isAuthenticated } = useAuth();
  const { canAccessSettings } = usePermissions();
  const settings = useCloudStorageSettings();
  const [drafts, setDrafts] = useState<Partial<Record<CloudProviderKey, ProviderDraft>>>({});

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to manage file storage.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessSettings()) {
    return (
      <AccessDenied message="Only the studio owner can configure cloud file management." />
    );
  }

  function providerState(provider: CloudProviderKey): CloudProviderConfig {
    const saved = settings.providers.find((entry) => entry.provider === provider)!;
    return { ...saved, ...drafts[provider] };
  }

  function patchDraft(provider: CloudProviderKey, patch: ProviderDraft) {
    setDrafts((current) => ({
      ...current,
      [provider]: { ...current[provider], ...patch },
    }));
  }

  function handleSave(provider: CloudProviderKey) {
    const state = providerState(provider);
    updateCloudProviderConfig(provider, {
      enabled: state.enabled,
      folderId: state.folderId,
      clientId: state.clientId,
      clientSecret: state.clientSecret,
      connected: state.enabled && Boolean(state.folderId.trim()),
    });
    setDrafts((current) => {
      const next = { ...current };
      delete next[provider];
      return next;
    });
    toast.success(`${CLOUD_PROVIDER_LABELS[provider]} settings saved`);
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/settings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">File Management</h1>
        <p className="text-sm text-muted-foreground">
          Connect Google Drive, Dropbox, or OneDrive. ST Manager stores folder IDs and API
          placeholders only — never media binaries.
        </p>
      </div>

      {settings.providers.map((saved) => {
        const provider = providerState(saved.provider);

        return (
          <Card key={provider.provider}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base">{CLOUD_PROVIDER_LABELS[provider.provider]}</CardTitle>
                  <CardDescription>
                    Project files using this provider will reference the configured folder.
                  </CardDescription>
                </div>
                <Badge variant={provider.connected ? "success" : "secondary"}>
                  {provider.connected ? "Connected" : "Not connected"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-center gap-3 sm:col-span-2">
                <Switch
                  checked={provider.enabled}
                  onCheckedChange={(checked) => patchDraft(provider.provider, { enabled: checked })}
                />
                <Label>Enable {CLOUD_PROVIDER_LABELS[provider.provider]}</Label>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor={`${provider.provider}-folder`}>Folder ID</Label>
                <Input
                  id={`${provider.provider}-folder`}
                  placeholder="Paste the cloud folder ID"
                  value={provider.folderId}
                  onChange={(event) =>
                    patchDraft(provider.provider, { folderId: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${provider.provider}-client-id`}>API Client ID (placeholder)</Label>
                <Input
                  id={`${provider.provider}-client-id`}
                  placeholder="OAuth client ID — future release"
                  value={provider.clientId}
                  onChange={(event) =>
                    patchDraft(provider.provider, { clientId: event.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`${provider.provider}-secret`}>API Secret (placeholder)</Label>
                <Input
                  id={`${provider.provider}-secret`}
                  type="password"
                  placeholder="OAuth secret — future release"
                  value={provider.clientSecret}
                  onChange={(event) =>
                    patchDraft(provider.provider, { clientSecret: event.target.value })
                  }
                />
              </div>
              <div>
                <Button type="button" onClick={() => handleSave(provider.provider)}>
                  Save {CLOUD_PROVIDER_LABELS[provider.provider]}
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
