"use client";

import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
} from "@st-manager/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useBookingSlots } from "@/hooks/useBookingSlots";
import { useActiveStudios } from "@/hooks/useStudios";
import { useProjects } from "@/hooks/useProjects";
import { layout } from "@st-manager/theme";
import { BOOKING_STATUS_OPTIONS } from "@/lib/bookings/constants";
import { createBooking, isSlotAvailable } from "@/lib/bookings/storage";
import type { BookingSlotId, ProjectBookingStatus } from "@/lib/bookings/types";
import { filterActiveProjects } from "@/lib/projects/filters";

export interface ProjectBookingFormValues {
  projectId: string;
  studioId: string;
  bookingFor: string;
  notes: string;
  date: string;
  slotId: BookingSlotId;
  status: ProjectBookingStatus;
}

interface ProjectBookingFormProps {
  initialValues?: Partial<ProjectBookingFormValues>;
  excludeBookingId?: string;
  onSubmit: (values: ProjectBookingFormValues) => Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
  lockProject?: boolean;
}

export function ProjectBookingForm({
  initialValues,
  excludeBookingId,
  onSubmit,
  isSubmitting = false,
  submitLabel = "Save Booking",
  lockProject = false,
}: ProjectBookingFormProps) {
  const projects = filterActiveProjects(useProjects());
  const studios = useActiveStudios();
  const slots = useBookingSlots();
  const [values, setValues] = useState<ProjectBookingFormValues>({
    projectId: initialValues?.projectId ?? "",
    studioId: initialValues?.studioId ?? "",
    bookingFor: initialValues?.bookingFor ?? "",
    notes: initialValues?.notes ?? "",
    date: initialValues?.date ?? new Date().toISOString().slice(0, 10),
    slotId: initialValues?.slotId ?? "slot_1",
    status: initialValues?.status ?? "booked",
  });

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === values.projectId),
    [projects, values.projectId],
  );

  const availableSlots = useMemo(() => {
    if (!values.studioId || !values.date) {
      return slots;
    }

    return slots.filter(
      (slot) =>
        slot.id === values.slotId ||
        isSlotAvailable(values.studioId, values.date, slot.id, excludeBookingId),
    );
  }, [slots, values.studioId, values.date, values.slotId, excludeBookingId]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit(values);
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-xl flex-col gap-4">
      <div className="space-y-2">
        <Label htmlFor="booking-project">Project *</Label>
        <select
          id="booking-project"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm disabled:opacity-60"
          value={values.projectId}
          disabled={lockProject}
          onChange={(event) =>
            setValues((current) => ({ ...current, projectId: event.target.value }))
          }
          required
        >
          <option value="">Select project</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.projectNumber} · {project.projectName}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-client">Client</Label>
        <Input
          id="booking-client"
          value={selectedProject?.clientName ?? ""}
          readOnly
          placeholder="Auto-filled from project"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-studio">Studio *</Label>
        <select
          id="booking-studio"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={values.studioId}
          onChange={(event) =>
            setValues((current) => ({ ...current, studioId: event.target.value }))
          }
          required
        >
          <option value="">Select studio</option>
          {studios.map((studio) => (
            <option key={studio.id} value={studio.id}>
              {studio.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-for">Booking For *</Label>
        <Input
          id="booking-for"
          value={values.bookingFor}
          onChange={(event) =>
            setValues((current) => ({ ...current, bookingFor: event.target.value }))
          }
          placeholder="Vocal Recording, Mix Revision..."
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-notes">Notes</Label>
        <Textarea
          id="booking-notes"
          value={values.notes}
          onChange={(event) =>
            setValues((current) => ({ ...current, notes: event.target.value }))
          }
          placeholder="Optional session notes"
          rows={3}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="booking-date">Date *</Label>
          <Input
            id="booking-date"
            type="date"
            value={values.date}
            onChange={(event) =>
              setValues((current) => ({ ...current, date: event.target.value }))
            }
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="booking-status">Status *</Label>
          <select
            id="booking-status"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={values.status}
            onChange={(event) =>
              setValues((current) => ({
                ...current,
                status: event.target.value as ProjectBookingStatus,
              }))
            }
            required
          >
            {BOOKING_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="booking-slot">Booking Slot *</Label>
        <select
          id="booking-slot"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
          value={values.slotId}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              slotId: event.target.value as BookingSlotId,
            }))
          }
          required
        >
          {availableSlots.length === 0 ? (
            <option value="">No slots available</option>
          ) : (
            availableSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label}
              </option>
            ))
          )}
        </select>
      </div>

      <Button type="submit" disabled={isSubmitting || availableSlots.length === 0}>
        {isSubmitting ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}

export function BookingCreatePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const initialProjectId = searchParams.get("projectId") ?? "";
  const initialDate = searchParams.get("date") ?? new Date().toISOString().slice(0, 10);

  async function handleSubmit(values: ProjectBookingFormValues) {
    setIsSubmitting(true);
    try {
      const booking = createBooking(values);
      toast.success("Booking saved");
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/bookings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to bookings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">New Booking</h1>
        <p className="text-sm text-muted-foreground">
          Every booking must belong to a project. Client is auto-filled from the project.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Details</CardTitle>
        </CardHeader>
        <CardContent>
          <ProjectBookingForm
            initialValues={{ projectId: initialProjectId, date: initialDate }}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel="Confirm Booking"
          />
        </CardContent>
      </Card>
    </div>
  );
}
