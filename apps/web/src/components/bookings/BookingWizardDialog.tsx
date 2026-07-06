"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@st-manager/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { createBooking } from "@/lib/bookings/storage";
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
}

export function BookingWizardDialog({
  open,
  onOpenChange,
  initialDate,
  initialSlotId,
  initialStudioId = "",
}: BookingWizardDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(values: ProjectBookingFormValues) {
    setIsSubmitting(true);
    try {
      const booking = createBooking(values);
      toast.success("Booking saved");
      onOpenChange(false);
      router.push(`/bookings/${booking.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create booking");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New Booking</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Choose a project first — client details auto-fill from the project.
        </p>
        <ProjectBookingForm
          key={`${initialDate}-${initialSlotId}-${initialStudioId}`}
          initialValues={{
            date: initialDate,
            slotId: initialSlotId,
            studioId: initialStudioId,
          }}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Confirm Booking"
        />
      </DialogContent>
    </Dialog>
  );
}
