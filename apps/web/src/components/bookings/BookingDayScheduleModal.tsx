"use client";

import { Badge, cn, Dialog, DialogContent, DialogHeader, DialogTitle } from "@st-manager/ui";

import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { bookingStatusStyles } from "@/lib/bookings/calendar-styles";
import { formatSlotTimeRange } from "@/lib/bookings/slot-utils";
import type { BookingSlot, BookingSlotId, ProjectBooking } from "@/lib/bookings/types";
import type { StudioRoom } from "@/lib/studios/types";

import {
  AddCustomSlotButton,
  DayCustomSlotInlineForm,
} from "./CreateCustomSlotForm";

interface BookingDayScheduleModalProps {
  date: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slots: BookingSlot[];
  bookings: ProjectBooking[];
  studios: StudioRoom[];
  studioFilter: string;
  activeStudios: StudioRoom[];
  dragBookingId: string | null;
  dropTargetSlotId: BookingSlotId | null;
  expandedCustomSlot: boolean;
  canBookSlot: (slotId: BookingSlotId) => boolean;
  canDropOnSlot: (slotId: BookingSlotId) => boolean;
  onBookSlot: (slotId: BookingSlotId) => void;
  onEditBooking: (booking: ProjectBooking) => void;
  onDragStart: (bookingId: string, event: React.DragEvent) => void;
  onDragEnd: () => void;
  onSlotDragOver: (slotId: BookingSlotId, event: React.DragEvent) => void;
  onSlotDragLeave: () => void;
  onSlotDrop: (slotId: BookingSlotId, event: React.DragEvent) => void;
  onExpandCustomSlot: () => void;
  onCollapseCustomSlot: () => void;
}

function formatPanelDate(dateKey: string): string {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function bookingsForSlot(bookings: ProjectBooking[], slotId: BookingSlotId): ProjectBooking[] {
  return bookings.filter((booking) => booking.slotId === slotId);
}

export function BookingDayScheduleModal({
  date,
  open,
  onOpenChange,
  slots,
  bookings,
  studios,
  studioFilter,
  activeStudios,
  dragBookingId,
  dropTargetSlotId,
  expandedCustomSlot,
  canBookSlot,
  canDropOnSlot,
  onBookSlot,
  onEditBooking,
  onDragStart,
  onDragEnd,
  onSlotDragOver,
  onSlotDragLeave,
  onSlotDrop,
  onExpandCustomSlot,
  onCollapseCustomSlot,
}: BookingDayScheduleModalProps) {
  if (!date) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Day Schedule</DialogTitle>
          <p className="text-sm text-muted-foreground">{formatPanelDate(date)}</p>
        </DialogHeader>

        <div className="space-y-2">
          {slots.map((slot) => {
            const slotBookings = bookingsForSlot(bookings, slot.id);
            const canBook = canBookSlot(slot.id) && !dragBookingId;
            const isDropTarget = dropTargetSlotId === slot.id;

            return (
              <div
                key={slot.id}
                className={cn(
                  "rounded-xl border border-border/60 bg-background/60 p-3 transition-colors",
                  isDropTarget && "border-primary/50 bg-primary/10",
                )}
                onDragOver={(event) => {
                  if (!dragBookingId || !canDropOnSlot(slot.id)) {
                    return;
                  }
                  onSlotDragOver(slot.id, event);
                }}
                onDragLeave={onSlotDragLeave}
                onDrop={(event) => {
                  if (!dragBookingId || !canDropOnSlot(slot.id)) {
                    return;
                  }
                  onSlotDrop(slot.id, event);
                }}
              >
                <p className="text-xs font-medium text-muted-foreground">
                  {formatSlotTimeRange(slot)}
                </p>
                <p className="mb-2 text-sm font-medium">{slot.label}</p>

                {slotBookings.length === 0 ? (
                  <button
                    type="button"
                    disabled={!canBook}
                    onClick={() => onBookSlot(slot.id)}
                    className={cn(
                      "w-full rounded-lg border border-dashed border-border/60 px-3 py-4 text-sm transition-colors",
                      canBook
                        ? "cursor-pointer text-muted-foreground hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                        : "cursor-not-allowed opacity-50",
                    )}
                  >
                    Click to Book
                  </button>
                ) : (
                  <ul className="space-y-2">
                    {slotBookings.map((booking) => {
                      const studio = studios.find((entry) => entry.id === booking.studioId);

                      return (
                        <li key={booking.id}>
                          <div
                            role="button"
                            tabIndex={0}
                            draggable
                            onClick={() => onEditBooking(booking)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                onEditBooking(booking);
                              }
                            }}
                            onDragStart={(event) => onDragStart(booking.id, event)}
                            onDragEnd={onDragEnd}
                            className={cn(
                              "w-full cursor-grab rounded-lg border p-3 text-left transition-colors hover:brightness-110 active:cursor-grabbing",
                              bookingStatusStyles(booking.status),
                              dragBookingId === booking.id && "opacity-50",
                            )}
                            style={{
                              borderLeftWidth: studio ? "4px" : undefined,
                              borderLeftColor: studio?.color ?? undefined,
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <p className="truncate font-medium">{booking.projectName}</p>
                              <Badge
                                variant={booking.status === "draft" ? "outline" : "success"}
                                className="shrink-0"
                              >
                                {BOOKING_STATUS_LABELS[booking.status]}
                              </Badge>
                            </div>
                            {studio ? (
                              <p className="mt-1 text-xs opacity-80">{studio.name}</p>
                            ) : null}
                          </div>
                        </li>
                      );
                    })}
                    {canBook ? (
                      <button
                        type="button"
                        onClick={() => onBookSlot(slot.id)}
                        className="w-full rounded-lg border border-dashed border-border/60 px-3 py-2 text-xs text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                      >
                        Click to Book
                      </button>
                    ) : null}
                  </ul>
                )}
              </div>
            );
          })}
        </div>

        <div className="pt-1">
          {expandedCustomSlot ? (
            <DayCustomSlotInlineForm
              dateKey={date}
              studioFilter={studioFilter}
              studios={activeStudios}
              onCancel={onCollapseCustomSlot}
              onSaved={onCollapseCustomSlot}
            />
          ) : (
            <AddCustomSlotButton onClick={onExpandCustomSlot} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
