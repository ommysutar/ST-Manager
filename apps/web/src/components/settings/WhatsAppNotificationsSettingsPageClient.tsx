"use client";

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Label,
  Switch,
  Textarea,
} from "@st-manager/ui";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { createDefaultTemplates } from "@/lib/whatsapp/constants";
import { WHATSAPP_PLACEHOLDER_LABELS } from "@/lib/whatsapp/types";
import { saveWhatsAppSettings } from "@/lib/whatsapp/storage";
import type { WhatsAppNotificationType } from "@/lib/whatsapp/types";

export function WhatsAppNotificationsSettingsPageClient() {
  const { isAuthenticated } = useAuth();
  const { canAccessSettings } = usePermissions();
  const settings = useWhatsAppSettings();
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(settings.templates.map((template) => [template.id, template.body])),
  );
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(settings.templates.map((template) => [template.id, template.enabled])),
  );

  function handleSave() {
    const next = {
      ...settings,
      templates: settings.templates.map((template) => ({
        ...template,
        body: drafts[template.id] ?? template.body,
        enabled: enabled[template.id] ?? template.enabled,
      })),
    };

    saveWhatsAppSettings(next);
    toast.success("WhatsApp notification settings saved");
  }

  function handleResetTemplate(id: WhatsAppNotificationType) {
    const defaultTemplate = createDefaultTemplates().find((template) => template.id === id);
    if (!defaultTemplate) {
      return;
    }

    setDrafts((current) => ({ ...current, [id]: defaultTemplate.body }));
    setEnabled((current) => ({ ...current, [id]: defaultTemplate.enabled }));
  }

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
    return <AccessDenied message="Only the studio owner can access settings." />;
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div>
        <Link href="/settings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">WhatsApp Notifications</h1>
        <p className="text-sm text-muted-foreground">
          Configure one-click WhatsApp message templates. Clicking the WhatsApp icon anywhere in the
          app opens a prepared message for the client.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Placeholders</CardTitle>
          <CardDescription>
            Use these variables in templates — they are replaced before opening WhatsApp.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.values(WHATSAPP_PLACEHOLDER_LABELS).map((placeholder) => (
              <code
                key={placeholder}
                className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
              >
                {placeholder}
              </code>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {settings.templates.map((template) => (
          <Card key={template.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <div>
                <CardTitle className="text-base">{template.label}</CardTitle>
                <CardDescription>
                  {enabled[template.id] ? "Enabled" : "Disabled"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`${template.id}-enabled`} className="text-sm">
                  Enabled
                </Label>
                <Switch
                  id={`${template.id}-enabled`}
                  checked={enabled[template.id] ?? template.enabled}
                  onCheckedChange={(checked) =>
                    setEnabled((current) => ({ ...current, [template.id]: checked }))
                  }
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                value={drafts[template.id] ?? template.body}
                onChange={(event) =>
                  setDrafts((current) => ({ ...current, [template.id]: event.target.value }))
                }
                rows={6}
                className="font-mono text-sm"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleResetTemplate(template.id)}
              >
                Reset to default
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button type="button" onClick={handleSave}>
        Save all templates
      </Button>
    </div>
  );
}
