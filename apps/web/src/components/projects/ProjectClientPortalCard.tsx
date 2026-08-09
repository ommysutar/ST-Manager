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
  Textarea,
} from "@st-manager/ui";
import type { ClientPortalLinkMetaDto } from "@st-manager/contracts";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useProjectBookings } from "@/hooks/useBookings";
import { useProfile } from "@/hooks/useProfile";
import { useStudios } from "@/hooks/useStudios";
import { clientPortalApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { buildWhatsAppUrl, normalizeWhatsAppPhone } from "@/lib/clients/whatsapp";
import { syncClientPortalNow } from "@/lib/client-portal/auto-sync";
import { loadPortalSettings, savePortalSettings } from "@/lib/client-portal/settings";
import {
  buildClientPortalSnapshot,
  buildPortalWhatsAppMessage,
  loadPortalUrl,
  markPortalLinked,
  savePortalUrl,
  type PortalEstimateInput,
} from "@/lib/client-portal/snapshot";
import type { StudioProject } from "@/lib/projects/types";

interface ProjectClientPortalCardProps {
  project: StudioProject;
}

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export function ProjectClientPortalCard({ project }: ProjectClientPortalCardProps) {
  const { user } = useAuth();
  const profile = useProfile(user);
  const bookings = useProjectBookings(project.id);
  const studios = useStudios();
  const initialSettings = loadPortalSettings(project.id);
  const [meta, setMeta] = useState<ClientPortalLinkMetaDto | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [studioMessage, setStudioMessage] = useState(initialSettings.studioMessage ?? "");
  const [estimateDate, setEstimateDate] = useState(
    toDateInputValue(initialSettings.estimate.estimatedCompletionDate),
  );
  const [scheduleStatus, setScheduleStatus] = useState<PortalEstimateInput["scheduleStatus"]>(
    initialSettings.estimate.scheduleStatus,
  );
  const [expectedDate, setExpectedDate] = useState(
    toDateInputValue(initialSettings.estimate.expectedCompletionDate),
  );
  const [delayReason, setDelayReason] = useState(initialSettings.estimate.delayReason ?? "");
  const [emailTo, setEmailTo] = useState(project.clientEmail ?? "");

  function currentEstimate(): PortalEstimateInput {
    return {
      estimatedCompletionDate: estimateDate ? new Date(estimateDate).toISOString() : null,
      scheduleStatus,
      expectedCompletionDate:
        scheduleStatus === "delayed" && expectedDate ? new Date(expectedDate).toISOString() : null,
      delayReason: scheduleStatus === "delayed" ? delayReason.trim() || null : null,
    };
  }

  function persistSettings(nextMessage = studioMessage) {
    savePortalSettings(project.id, {
      studioMessage: nextMessage.trim() || null,
      estimate: currentEstimate(),
    });
  }

  function buildSnapshot() {
    persistSettings();
    return buildClientPortalSnapshot({
      project,
      profile,
      bookings,
      studios,
      studioMessage: studioMessage.trim() || null,
      estimate: currentEstimate(),
    });
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => clientPortalApi.getMeta(project.id))
      .then((data) => {
        if (cancelled) return;
        setMeta(data);
        if (data.hasLink) {
          markPortalLinked(project.id);
        }
        if (data.studioMessage) {
          setStudioMessage(data.studioMessage);
        }
        const stored = loadPortalUrl(project.id);
        if (stored) setPortalUrl(stored);
        if (data.hasLink) {
          void syncClientPortalNow(project.id);
        }
      })
      .catch(() => {
        // Portal may be unavailable offline; card still renders.
      });
    return () => {
      cancelled = true;
    };
  }, [project.id]);

  async function createOrRegenerate(mode: "create" | "regenerate") {
    setBusy(true);
    try {
      const snapshot = buildSnapshot();
      const result =
        mode === "create"
          ? await clientPortalApi.create(project.id, { snapshot, studioMessage: snapshot.studioMessage })
          : await clientPortalApi.regenerate(project.id, { snapshot, studioMessage: snapshot.studioMessage });
      setMeta(result.meta);
      setPortalUrl(result.portalUrl);
      savePortalUrl(project.id, result.portalUrl);
      markPortalLinked(project.id);
      toast.success(mode === "create" ? "Secure portal link created" : "Secure portal link regenerated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to update portal link"));
    } finally {
      setBusy(false);
    }
  }

  async function syncSnapshot() {
    if (!meta?.hasLink) return;
    setBusy(true);
    try {
      const snapshot = buildSnapshot();
      const next = await clientPortalApi.sync(project.id, {
        snapshot,
        studioMessage: snapshot.studioMessage,
      });
      setMeta(next);
      markPortalLinked(project.id);
      toast.success("Portal details updated");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to sync portal"));
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!portalUrl) {
      await createOrRegenerate(meta?.hasLink ? "regenerate" : "create");
      return;
    }
    try {
      await navigator.clipboard.writeText(portalUrl);
      toast.success("Secure link copied");
      await syncSnapshot();
    } catch {
      toast.error("Could not copy link");
    }
  }

  async function shareWhatsApp() {
    let url = portalUrl;
    if (!url) {
      await createOrRegenerate(meta?.hasLink ? "regenerate" : "create");
      url = loadPortalUrl(project.id);
    }
    if (!url) return;

    const phone = project.clientMobile ? normalizeWhatsAppPhone(project.clientMobile) : "";
    if (!phone) {
      toast.error("Client mobile number is required for WhatsApp");
      return;
    }

    const message = buildPortalWhatsAppMessage({
      clientName: project.clientName,
      studioName: profile?.studioName || "Studio",
      portalUrl: url,
    });
    window.open(buildWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
    await syncSnapshot();
  }

  async function shareEmail() {
    let url = portalUrl;
    if (!url) {
      await createOrRegenerate(meta?.hasLink ? "regenerate" : "create");
      url = loadPortalUrl(project.id);
    }
    if (!url) return;
    if (!emailTo.trim()) {
      toast.error("Client email is required");
      return;
    }

    setBusy(true);
    try {
      await syncSnapshot();
      await clientPortalApi.sendEmail(project.id, { to: emailTo.trim(), portalUrl: url });
      toast.success("Portal email sent");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to send portal email"));
    } finally {
      setBusy(false);
    }
  }

  async function disableLink() {
    setBusy(true);
    try {
      const next = await clientPortalApi.disable(project.id);
      setMeta(next);
      toast.success("Portal link disabled");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to disable link"));
    } finally {
      setBusy(false);
    }
  }

  async function enableLink() {
    setBusy(true);
    try {
      const next = await clientPortalApi.enable(project.id);
      setMeta(next);
      toast.success("Portal link enabled");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Failed to enable link"));
    } finally {
      setBusy(false);
    }
  }

  const status = meta?.status ?? "missing";

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle>Client Portal</CardTitle>
        <CardDescription>
          Share a secure read-only project link. Clients do not need an account. Project changes sync
          automatically.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Portal Status</p>
            <Badge variant={status === "active" ? "success" : "secondary"} className="mt-1 capitalize">
              {status}
            </Badge>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Created Date</p>
            <p className="text-sm font-medium">{formatDate(meta?.createdAt ?? null)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Expiry Date</p>
            <p className="text-sm font-medium">{formatDate(meta?.expiresAt ?? null)}</p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Estimated Completion Date</Label>
            <Input
              type="date"
              value={estimateDate}
              onChange={(e) => {
                setEstimateDate(e.target.value);
                savePortalSettings(project.id, {
                  studioMessage: studioMessage.trim() || null,
                  estimate: {
                    estimatedCompletionDate: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : null,
                    scheduleStatus,
                    expectedCompletionDate:
                      scheduleStatus === "delayed" && expectedDate
                        ? new Date(expectedDate).toISOString()
                        : null,
                    delayReason: scheduleStatus === "delayed" ? delayReason.trim() || null : null,
                  },
                });
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>Schedule Status</Label>
            <select
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={scheduleStatus}
              onChange={(e) => {
                const next = e.target.value as PortalEstimateInput["scheduleStatus"];
                setScheduleStatus(next);
                // Persist with `next` immediately — do not call persistSettings() here;
                // React state is still stale until the next render.
                savePortalSettings(project.id, {
                  studioMessage: studioMessage.trim() || null,
                  estimate: {
                    estimatedCompletionDate: estimateDate
                      ? new Date(estimateDate).toISOString()
                      : null,
                    scheduleStatus: next,
                    expectedCompletionDate:
                      next === "delayed" && expectedDate
                        ? new Date(expectedDate).toISOString()
                        : null,
                    delayReason: next === "delayed" ? delayReason.trim() || null : null,
                  },
                });
              }}
            >
              <option value="on_schedule">On Schedule</option>
              <option value="delayed">Delayed</option>
              <option value="unknown">Not set</option>
            </select>
          </div>
        </div>

        {scheduleStatus === "delayed" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Expected Completion Date</Label>
              <Input
                type="date"
                value={expectedDate}
                onChange={(e) => {
                  const nextExpected = e.target.value;
                  setExpectedDate(nextExpected);
                  savePortalSettings(project.id, {
                    studioMessage: studioMessage.trim() || null,
                    estimate: {
                      estimatedCompletionDate: estimateDate
                        ? new Date(estimateDate).toISOString()
                        : null,
                      scheduleStatus,
                      expectedCompletionDate: nextExpected
                        ? new Date(nextExpected).toISOString()
                        : null,
                      delayReason: delayReason.trim() || null,
                    },
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>Delay Reason (optional)</Label>
              <Input
                value={delayReason}
                onChange={(e) => {
                  const nextReason = e.target.value;
                  setDelayReason(nextReason);
                  savePortalSettings(project.id, {
                    studioMessage: studioMessage.trim() || null,
                    estimate: {
                      estimatedCompletionDate: estimateDate
                        ? new Date(estimateDate).toISOString()
                        : null,
                      scheduleStatus,
                      expectedCompletionDate: expectedDate
                        ? new Date(expectedDate).toISOString()
                        : null,
                      delayReason: nextReason.trim() || null,
                    },
                  });
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Studio Message (optional)</Label>
          <Textarea
            rows={2}
            value={studioMessage}
            onChange={(e) => setStudioMessage(e.target.value)}
            onBlur={() => persistSettings()}
            placeholder="A short note for your client"
          />
        </div>

        <div className="space-y-2">
          <Label>Email recipient</Label>
          <Input
            type="email"
            value={emailTo}
            onChange={(e) => setEmailTo(e.target.value)}
            placeholder="client@email.com"
          />
        </div>

        {portalUrl ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <p className="break-all text-xs text-muted-foreground">{portalUrl}</p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void copyLink()}>
            Copy Secure Link
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void shareWhatsApp()}>
            Share via WhatsApp
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void shareEmail()}>
            Share via Email
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void createOrRegenerate("regenerate")}
          >
            Regenerate Link
          </Button>
          {status === "disabled" ? (
            <Button type="button" variant="outline" disabled={busy} onClick={() => void enableLink()}>
              Enable Link
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={busy || !meta?.hasLink}
              onClick={() => void disableLink()}
            >
              Disable Link
            </Button>
          )}
          <Button type="button" variant="ghost" disabled={busy || !meta?.hasLink} onClick={() => void syncSnapshot()}>
            Sync Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
