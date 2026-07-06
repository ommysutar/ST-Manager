"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, Progress } from "@st-manager/ui";
import {
  CloudIcon,
  FolderKanbanIcon,
  UserIcon,
  WalletIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ProjectBookingsTab } from "@/components/projects/ProjectBookingsTab";
import { ProjectExpensesTab } from "@/components/projects/ProjectExpensesTab";
import { ProjectFilesLinks } from "@/components/projects/ProjectFilesLinks";
import { ProjectNotesTab } from "@/components/projects/ProjectNotesTab";
import { ProjectTaskFlow } from "@/components/projects/ProjectTaskFlow";
import { useProjectBookings } from "@/hooks/useBookings";
import { usePaymentsForProject } from "@/hooks/usePayments";
import { useStudios } from "@/hooks/useStudios";
import { formatINR } from "@/lib/currency";
import { getBookingSlotLabel } from "@/lib/bookings/slots";
import { PAYMENT_STATUS_LABELS, getPaymentStatus } from "@/lib/payments/status";
import { PROJECT_STATUS_LABELS } from "@/lib/projects/constants";
import { calculateProjectProgress, getCurrentTaskName, getPrimaryEngineer } from "@/lib/projects/progress";
import type { StudioProject } from "@/lib/projects/types";

type ProjectSection =
  | "overview"
  | "task-flow"
  | "bookings"
  | "payment"
  | "files"
  | "expenses"
  | "timeline"
  | "notes";

const SECTIONS: { id: ProjectSection; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "task-flow", label: "Task Flow" },
  { id: "bookings", label: "Bookings" },
  { id: "payment", label: "Payments" },
  { id: "files", label: "Files & Links" },
  { id: "expenses", label: "Project Expenses" },
  { id: "timeline", label: "Timeline" },
  { id: "notes", label: "Notes" },
];

interface ProjectOverviewSectionsProps {
  project: StudioProject;
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ProjectOverviewSections({ project }: ProjectOverviewSectionsProps) {
  const [section, setSection] = useState<ProjectSection>("overview");
  const [now] = useState(() => Date.now());
  const progress = calculateProjectProgress(project);
  const bookings = useProjectBookings(project.id);
  const studios = useStudios();
  const payments = usePaymentsForProject(project.id);
  const paymentStatus = getPaymentStatus(project);
  const receivedAmount = Math.max(0, project.grandTotal - project.remainingBalance);

  const upcomingBooking = bookings
    .filter((booking) => booking.status === "confirmed")
    .find((booking) => new Date(`${booking.date}T23:59:59`).getTime() >= now);

  const recentFiles = [...project.files]
    .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
    .slice(0, 3);

  const recentTransactions = payments.slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((entry) => (
          <Button
            key={entry.id}
            type="button"
            size="sm"
            variant={section === entry.id ? "default" : "outline"}
            onClick={() => setSection(entry.id)}
          >
            {entry.label}
          </Button>
        ))}
      </div>

      {section === "overview" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <FolderKanbanIcon className="size-4" />
                Project Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <p className="text-muted-foreground">Project Number</p>
                <p className="font-mono font-medium">{project.projectNumber}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Category</p>
                <p className="font-medium">{project.projectCategory ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <Badge variant={project.status === "active" ? "success" : "secondary"}>
                  {PROJECT_STATUS_LABELS[project.status] ?? project.status}
                </Badge>
              </div>
              <div>
                <p className="text-muted-foreground">Assigned Engineer</p>
                <p className="font-medium">{getPrimaryEngineer(project)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{formatDateTime(project.createdAt)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="font-medium">{formatDateTime(project.updatedAt)}</p>
              </div>
              {project.inquiryId ? (
                <div className="sm:col-span-2">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/inquiries/${project.inquiryId}`}>View Source Inquiry</Link>
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserIcon className="size-4" />
                Client Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Client Name</p>
                <p className="font-medium">{project.clientName}</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Mobile</p>
                  <p className="font-medium">{project.clientMobile || "—"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{project.clientEmail || "—"}</p>
                </div>
              </div>
              {project.clientId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/clients/${project.clientId}`}>View Client</Link>
                </Button>
              ) : (
                <p className="text-xs text-muted-foreground">
                  This project is not linked to a client record yet.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>
                    {progress.completedCount} / {progress.totalCount} tasks
                  </span>
                  <span className="font-medium">{progress.percent}%</span>
                </div>
                <Progress value={progress.percent} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground">Remaining Tasks</p>
                  <p className="font-medium">{progress.totalCount - progress.completedCount}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Current Active Task</p>
                  <p className="font-medium">{getCurrentTaskName(project.tasks)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Booking</CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {upcomingBooking ? (
                <div className="space-y-1">
                  <p className="font-medium">{upcomingBooking.bookingFor}</p>
                  <p className="text-muted-foreground">
                    {studios.find((studio) => studio.id === upcomingBooking.studioId)?.name ?? "Studio"} ·{" "}
                    {new Date(`${upcomingBooking.date}T12:00:00`).toLocaleDateString()} ·{" "}
                    {getBookingSlotLabel(upcomingBooking.slotId)}
                  </p>
                </div>
              ) : (
                <p className="text-muted-foreground">No upcoming bookings scheduled.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <WalletIcon className="size-4" />
                Payment Summary
              </CardTitle>
              <Badge variant={paymentStatus === "paid" ? "success" : "secondary"}>
                {PAYMENT_STATUS_LABELS[paymentStatus]}
              </Badge>
            </CardHeader>
            <CardContent className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <p className="text-muted-foreground">Value</p>
                <p className="font-medium">{formatINR(project.grandTotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Received</p>
                <p className="font-medium text-emerald-600 dark:text-emerald-400">
                  {formatINR(receivedAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pending</p>
                <p className="font-medium text-amber-600 dark:text-amber-400">
                  {formatINR(project.remainingBalance)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CloudIcon className="size-4" />
                Recent Files
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {recentFiles.length === 0 ? (
                <p className="text-muted-foreground">No files linked yet.</p>
              ) : (
                recentFiles.map((file) => (
                  <a
                    key={file.id}
                    href={file.cloudUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate rounded-md border border-border/50 px-3 py-2 hover:border-primary/40 hover:bg-primary/5"
                  >
                    {file.name}
                  </a>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              {project.clientId ? (
                <Button asChild variant="outline" size="sm">
                  <Link href={`/clients/${project.clientId}`}>Client</Link>
                </Button>
              ) : null}
              <Button type="button" variant="outline" size="sm" onClick={() => setSection("bookings")}>
                Bookings
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/payments/${project.id}`}>Payments</Link>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSection("files")}>
                Files
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setSection("task-flow")}>
                Task Flow
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {section === "task-flow" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Task Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectTaskFlow project={project} />
          </CardContent>
        </Card>
      ) : null}

      {section === "bookings" ? <ProjectBookingsTab projectId={project.id} /> : null}

      {section === "payment" ? (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
            <CardTitle className="text-base">Payment Summary</CardTitle>
            <Badge variant={paymentStatus === "paid" ? "success" : "secondary"}>
              {PAYMENT_STATUS_LABELS[paymentStatus]}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">Project Value</p>
                <p className="text-lg font-semibold">{formatINR(project.grandTotal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Received Amount</p>
                <p className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
                  {formatINR(receivedAmount)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Pending Amount</p>
                <p className="text-lg font-semibold text-amber-600 dark:text-amber-400">
                  {formatINR(project.remainingBalance)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Transactions</p>
              {recentTransactions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {recentTransactions.map((payment) => (
                    <li
                      key={payment.id}
                      className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm"
                    >
                      <span className="text-muted-foreground">
                        {formatDateTime(payment.createdAt)} · {payment.method.toUpperCase()}
                      </span>
                      <span className="font-medium">{formatINR(payment.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Button asChild>
              <Link href={`/payments/${project.id}`}>Open Payments</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {section === "files" ? <ProjectFilesLinks projectId={project.id} /> : null}

      {section === "expenses" ? <ProjectExpensesTab projectId={project.id} /> : null}

      {section === "timeline" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Project timeline will aggregate task flow, bookings, payments, and sessions in a
              future release.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {section === "notes" ? <ProjectNotesTab projectId={project.id} /> : null}
    </div>
  );
}
