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
import {
  buildClientPortalSnapshot,
  buildPortalWhatsAppMessage,
  loadPortalUrl,
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

export function ProjectClientPortalCard({ project }: ProjectClientPortalCardProps) {
  const { user } = useAuth();
  const profile = useProfile(user);
  const bookings = useProjectBookings(project.id);
  const studios = useStudios();
  const [meta, setMeta] = useState<ClientPortalLinkMetaDto | null>(null);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [studioMessage, setStudioMessage] = useState("");
  const [estimateDate, setEstimateDate] = useState("");
  const [scheduleStatus, setScheduleStatus] = useState<PortalEstimateInput["scheduleStatus"]>("on_schedule");
  const [expectedDate, setExpectedDate] = useState("");
  const [delayReason, setDelayReason] = useState("");
  const [emailTo, setEmailTo] = useState(project.clientEmail ?? "");

  function buildSnapshot() {
    return buildClientPortalSnapshot({
      project,
      profile,
      bookings,
      studios,
      studioMessage: studioMessage.trim() || null,
      estimate: {
        estimatedCompletionDate: estimateDate ? new Date(estimateDate).toISOString() : null,
        scheduleStatus,
        expectedCompletionDate:
          scheduleStatus === "delayed" && expectedDate ? new Date(expectedDate).toISOString() : null,
        delayReason: scheduleStatus === "delayed" ? delayReason.trim() || null : null,
      },
    });
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve()
      .then(() => clientPortalApi.getMeta(project.id))
      .then((data) => {
        if (cancelled) return;
        setMeta(data);
        setStudioMessage(data.studioMessage ?? "");
        const stored = loadPortalUrl(project.id);
        if (stored) setPortalUrl(stored);
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
          Share a secure read-only project link. Clients do not need an account.
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
            <Input type="date" value={estimateDate} onChange={(e) => setEstimateDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Schedule Status</Label>
            <select
              className="flex h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={scheduleStatus}
              onChange={(e) => setScheduleStatus(e.target.value as PortalEstimateInput["scheduleStatus"])}
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
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Delay Reason (optional)</Label>
              <Input value={delayReason} onChange={(e) => setDelayReason(e.target.value)} />
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Studio Message (optional)</Label>
          <Textarea
            rows={2}
            value={studioMessage}
            onChange={(e) => setStudioMessage(e.target.value)}
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
