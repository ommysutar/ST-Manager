"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@st-manager/ui";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useBookings } from "@/hooks/useBookings";
import { createBooking, updateBooking } from "@/lib/bookings/storage";
import type { BookingSlotId } from "@/lib/bookings/types";

import {
  ProjectBookingForm,
  type ProjectBookingFormValues,
} from "./BookingCreatePageClient";

export interface BookingWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate: string;
  initialSlotId: BookingSlotId;
  initialStudioId?: string;
  /** When set, the wizard opens in edit mode for an existing booking. */
  bookingId?: string;
}

export function BookingWizardDialog({
  open,
  onOpenChange,
  initialDate,
  initialSlotId,
  initialStudioId = "",
  bookingId,
}: BookingWizardDialogProps) {
  const bookings = useBookings();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isEditMode = Boolean(bookingId);

  const booking = useMemo(
    () => (bookingId ? bookings.find((entry) => entry.id === bookingId) : undefined),
    [bookings, bookingId],
  );

  async function handleSubmit(values: ProjectBookingFormValues) {
    setIsSubmitting(true);
    try {
      if (isEditMode && bookingId) {
        updateBooking(bookingId, {
          studioId: values.studioId,
          bookingFor: values.bookingFor,
          notes: values.notes,
          date: values.date,
          slotId: values.slotId,
          status: values.status,
        });
        toast.success("Booking updated");
      } else {
        createBooking({ ...values, status: "booked" });
        toast.success("Booking saved");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  const formKey = isEditMode
    ? `edit-${bookingId}`
    : `new-${initialDate}-${initialSlotId}-${initialStudioId}`;

  const initialValues = isEditMode && booking
    ? {
        projectId: booking.projectId,
        studioId: booking.studioId,
        bookingFor: booking.bookingFor,
        notes: booking.notes,
        date: booking.date,
        slotId: booking.slotId,
        status: booking.status,
      }
    : {
        date: initialDate,
        slotId: initialSlotId,
        studioId: initialStudioId,
        status: "booked" as const,
      };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Edit Booking" : "New Booking"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {isEditMode
            ? "Update booking details. Project assignment stays linked to this booking."
            : "Choose a project first — client details auto-fill from the project."}
        </p>
        {isEditMode && !booking ? (
          <p className="text-sm text-destructive">Booking not found.</p>
        ) : (
          <ProjectBookingForm
            key={formKey}
            mode={isEditMode ? "full" : "wizard"}
            lockProject={isEditMode}
            excludeBookingId={bookingId}
            initialValues={initialValues}
            onSubmit={handleSubmit}
            isSubmitting={isSubmitting}
            submitLabel={isEditMode ? "Save Changes" : "Save Booking"}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
