"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@st-manager/ui";
import type { ClientPortalSnapshotDto } from "@st-manager/contracts";
import { useCallback, useEffect, useState } from "react";

import { clientPortalApi } from "@/lib/api-client";
import { getApiErrorMessage } from "@/lib/api-error";
import { formatINR } from "@/lib/currency";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function printDocument(doc: ClientPortalSnapshotDto["documents"][number], studioName: string) {
  const lines = doc.lineItems
    .map(
      (item) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0;">${item.label}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0;text-align:right;">${formatINR(item.amount)}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><head><title>${doc.title} ${doc.number}</title>
    <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;padding:32px;color:#0f172a} h1{margin:0 0 8px} table{width:100%;border-collapse:collapse;margin-top:24px}</style>
    </head><body>
    <h1>${doc.title}</h1>
    <p>${studioName} · ${doc.number}</p>
    <p>Issued: ${formatDate(doc.issuedAt)}</p>
    <table><thead><tr><th style="text-align:left;padding:8px;">Item</th><th style="text-align:right;padding:8px;">Amount</th></tr></thead>
    <tbody>${lines}</tbody>
    <tfoot><tr><td style="padding:12px 8px;font-weight:700;">Total</td><td style="padding:12px 8px;text-align:right;font-weight:700;">${formatINR(doc.total)}</td></tr></tfoot>
    </table>
    <script>window.onload=()=>window.print()</script>
    </body></html>`;
  const win = window.open("", "_blank", "noopener,noreferrer");
  if (!win) return;
  win.document.write(html);
  win.document.close();
}

export function ClientPortalPageClient({ token }: { token: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [snapshot, setSnapshot] = useState<ClientPortalSnapshotDto | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);

  const loadPortal = useCallback((opts?: { quiet?: boolean }) => {
    if (!opts?.quiet) {
      setLoading(true);
    }
    setError(null);
    setExpired(false);
    void clientPortalApi
      .access(token)
      .then((data) => {
        setSnapshot(data.snapshot);
        setExpiresAt(data.expiresAt);
        setLoading(false);
      })
      .catch((err) => {
        const message = getApiErrorMessage(err, "Unable to open portal");
        if (/expired/i.test(message)) {
          setExpired(true);
          setSnapshot(null);
        }
        setError(message);
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      queueMicrotask(() => {
        if (cancelled) return;
        loadPortal();
      });
    };
    run();

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        queueMicrotask(() => loadPortal({ quiet: true }));
      }
    };
    const onPageShow = () => {
      queueMicrotask(() => loadPortal({ quiet: true }));
    };

    window.addEventListener("pageshow", onPageShow);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener("pageshow", onPageShow);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [loadPortal]);

  if (loading && !snapshot && !expired && !error) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
        <p className="text-sm text-slate-500">Loading project portal…</p>
      </div>
    );
  }

  if (expired) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Link expired</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>This secure project link has expired.</p>
            <p>Please contact your Studio if you need access again.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if ((error || !snapshot) && !loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle>Portal unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error ?? "Not found"}</CardContent>
        </Card>
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  const quotation = snapshot.documents.find((doc) => doc.type === "quotation");
  const invoice = snapshot.documents.find((doc) => doc.type === "invoice");
  const clientFiles = snapshot.clientFiles ?? [];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-50 to-white text-slate-900">
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:flex-row sm:items-center sm:px-6">
          {snapshot.studio.logoDataUrl ? (
            <img
              src={snapshot.studio.logoDataUrl}
              alt=""
              className="size-16 rounded-2xl border object-contain"
            />
          ) : (
            <div className="flex size-16 items-center justify-center rounded-2xl bg-blue-600 text-lg font-bold text-white">
              ST
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight">{snapshot.studio.name}</h1>
            <p className="text-sm text-slate-500">{snapshot.studio.address || "Studio project portal"}</p>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
              {snapshot.studio.phone ? <span>{snapshot.studio.phone}</span> : null}
              {snapshot.studio.email ? <span>{snapshot.studio.email}</span> : null}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Project Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Info label="Project Name" value={snapshot.projectName} />
            <Info label="Client Name" value={snapshot.clientName} />
            <Info label="Service" value={snapshot.service} />
            <Info label="Package" value={snapshot.packageName} />
            <Info label="Current Status" value={snapshot.currentStatus} />
            <div className="sm:col-span-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Overall Progress</span>
                <span className="font-semibold text-blue-600">{snapshot.progressPercent}%</span>
              </div>
              <Progress value={snapshot.progressPercent} className="h-3" />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Estimated Completion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Info label="Estimated Completion Date" value={formatDate(snapshot.estimate.estimatedCompletionDate)} />
            <div>
              <p className="text-sm text-slate-500">Status</p>
              {snapshot.estimate.scheduleStatus === "delayed" ? (
                <p className="mt-1 text-base font-medium text-amber-600">🟠 Delayed</p>
              ) : snapshot.estimate.scheduleStatus === "on_schedule" ? (
                <p className="mt-1 text-base font-medium text-emerald-600">🟢 On Schedule</p>
              ) : (
                <p className="mt-1 text-base font-medium text-slate-500">Not set</p>
              )}
            </div>
            {snapshot.estimate.scheduleStatus === "delayed" ? (
              <>
                <Info label="Expected Completion Date" value={formatDate(snapshot.estimate.expectedCompletionDate)} />
                {snapshot.estimate.delayReason ? (
                  <Info label="Delay Reason" value={snapshot.estimate.delayReason} />
                ) : null}
              </>
            ) : null}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Workflow Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-3">
              {snapshot.timeline.map((step) => (
                <li
                  key={step.key}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
                    step.current
                      ? "border-blue-500 bg-blue-50"
                      : step.completed
                        ? "border-emerald-200 bg-emerald-50/60"
                        : "border-slate-200 bg-white"
                  }`}
                >
                  <span
                    className={`flex size-7 items-center justify-center rounded-full text-xs font-bold ${
                      step.completed || step.current
                        ? "bg-blue-600 text-white"
                        : "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {step.completed ? "✓" : step.current ? "•" : ""}
                  </span>
                  <span className="text-sm font-medium">{step.label}</span>
                  {step.current ? <Badge className="ml-auto">Current</Badge> : null}
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Booking</CardTitle>
          </CardHeader>
          <CardContent>
            {snapshot.upcomingBooking ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <Info label="Date" value={formatDate(snapshot.upcomingBooking.date)} />
                <Info label="Time" value={snapshot.upcomingBooking.timeLabel} />
                <Info label="Studio" value={snapshot.upcomingBooking.studioName} />
              </div>
            ) : (
              <p className="text-sm text-slate-500">No upcoming session scheduled.</p>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Payment Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Info label="Total Amount" value={formatINR(snapshot.payment.totalAmount)} />
            <Info label="Advance Paid" value={formatINR(snapshot.payment.advancePaid)} />
            <Info label="Remaining Amount" value={formatINR(snapshot.payment.remainingAmount)} />
            <Info label="Payment Status" value={snapshot.payment.status} />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Downloads</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="button"
              size="lg"
              className="w-full sm:flex-1"
              disabled={!quotation}
              onClick={() => quotation && printDocument(quotation, snapshot.studio.name)}
            >
              Quotation PDF
            </Button>
            <Button
              type="button"
              size="lg"
              variant="outline"
              className="w-full sm:flex-1"
              disabled={!invoice}
              onClick={() => invoice && printDocument(invoice, snapshot.studio.name)}
            >
              Invoice PDF
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle>Files shared with client</CardTitle>
          </CardHeader>
          <CardContent>
            {clientFiles.length > 0 ? (
              <ul className="space-y-2">
                {clientFiles.map((file) => (
                  <li key={`${file.kind}-${file.url}`}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {file.name}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No files shared yet.</p>
            )}
          </CardContent>
        </Card>

        {snapshot.clientNotes ? (
          <Card className="rounded-2xl border-slate-200 shadow-sm">
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
              {snapshot.clientNotes}
            </CardContent>
          </Card>
        ) : null}

        {snapshot.studioMessage ? (
          <Card className="rounded-2xl border-blue-200 bg-blue-50/50 shadow-sm">
            <CardHeader>
              <CardTitle>Studio Message</CardTitle>
            </CardHeader>
            <CardContent className="text-sm leading-relaxed text-slate-700">
              {snapshot.studioMessage}
            </CardContent>
          </Card>
        ) : null}

        {expiresAt ? (
          <p className="pb-8 text-center text-xs text-slate-400">
            Portal access expires on {formatDate(expiresAt)}
          </p>
        ) : (
          <p className="pb-8 text-center text-xs text-slate-400">Secure read-only project portal</p>
        )}
      </main>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-base font-medium text-slate-900">{value || "—"}</p>
    </div>
  );
}
