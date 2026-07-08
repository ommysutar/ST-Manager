"use client";

import { Badge, Button, Card, CardContent, CardHeader, CardTitle, cn } from "@st-manager/ui";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useEffect, useMemo, useState, type DragEvent } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks/useBookings";
import { useBookingSlots } from "@/hooks/useBookingSlots";
import { useStudios } from "@/hooks/useStudios";
import { addDays, formatMonthYear, startOfWeek, toDateKey } from "@/lib/calendar-utils";
import { BOOKING_STATUS_LABELS } from "@/lib/bookings/constants";
import { isSlotAvailable, rescheduleBooking } from "@/lib/bookings/storage";
import type { BookingSlotId, ProjectBooking } from "@/lib/bookings/types";

import { BookingDayScheduleModal } from "./BookingDayScheduleModal";
import { BookingWizardDialog } from "./BookingWizardDialog";
import { BookingsMonthView } from "./BookingsMonthView";
import {
  AddCustomSlotButton,
  DayCustomSlotInlineForm,
} from "./CreateCustomSlotForm";

type CalendarView = "today" | "week" | "month";

interface WizardTarget {
  date: string;
  slotId: BookingSlotId;
  studioId: string;
  bookingId?: string;
}

function formatDayLabel(date: Date): string {
  return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

function isSameDayString(day: Date, isoDate: string): boolean {
  return toDateKey(day) === isoDate;
}

function viewLabel(view: CalendarView): string {
  if (view === "today") return "Today";
  if (view === "week") return "Week";
  return "Month";
}

function useIsMobileViewport(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isMobile;
}

export function BookingsPageClient() {
  const { isAuthenticated } = useAuth();
  const bookings = useBookings();
  const studios = useStudios();
  const slots = useBookingSlots();
  const isMobileViewport = useIsMobileViewport();
  const [view, setView] = useState<CalendarView>("week");
  const [anchorDate, setAnchorDate] = useState(() => new Date());
  const [studioFilter, setStudioFilter] = useState<string>("all");
  const [dragBookingId, setDragBookingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ date: string; slotId: BookingSlotId } | null>(
    null,
  );
  const [wizardTarget, setWizardTarget] = useState<WizardTarget | null>(null);
  const [expandedCustomSlotDay, setExpandedCustomSlotDay] = useState<string | null>(null);
  const [dayPanelDate, setDayPanelDate] = useState<string | null>(null);
  const [monthDropTargetDate, setMonthDropTargetDate] = useState<string | null>(null);

  const effectiveView: CalendarView =
    isMobileViewport && view === "week" ? "today" : view;

  const activeStudios = useMemo(() => studios.filter((studio) => studio.active), [studios]);

  const weekStart = useMemo(() => startOfWeek(anchorDate), [anchorDate]);
  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)),
    [weekStart],
  );

  const displayDays = useMemo(() => {
    if (effectiveView === "today") {
      return [anchorDate];
    }
    if (effectiveView === "week") {
      return weekDays;
    }
    return [];
  }, [effectiveView, anchorDate, weekDays]);

  const visibleBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        if (booking.status === "cancelled") return false;
        if (studioFilter !== "all" && booking.studioId !== studioFilter) return false;
        return true;
      }),
    [bookings, studioFilter],
  );

  function bookingsForDaySlot(day: Date, slotId: BookingSlotId): ProjectBooking[] {
    return visibleBookings.filter(
      (booking) => isSameDayString(day, booking.date) && booking.slotId === slotId,
    );
  }

  function shiftPeriod(direction: -1 | 1) {
    if (view === "today") {
      setAnchorDate((current) => addDays(current, direction));
      return;
    }
    if (view === "month") {
      setAnchorDate(
        (current) => new Date(current.getFullYear(), current.getMonth() + direction, 1),
      );
      return;
    }
    setAnchorDate((current) => addDays(current, direction * 7));
  }

  function jumpToToday() {
    setAnchorDate(new Date());
  }

  function bookingsForDate(dateKey: string): ProjectBooking[] {
    return visibleBookings.filter((booking) => booking.date === dateKey);
  }

  function dateFromKey(dateKey: string): Date {
    return new Date(`${dateKey}T12:00:00`);
  }

  function canBookSlotForDateKey(dateKey: string, slotId: BookingSlotId): boolean {
    return canOpenWizard(dateFromKey(dateKey), slotId);
  }

  function openWizardForDateKey(dateKey: string, slotId: BookingSlotId) {
    openWizard(dateFromKey(dateKey), slotId);
  }

  function openEditWizard(booking: ProjectBooking) {
    setWizardTarget({
      date: booking.date,
      slotId: booking.slotId,
      studioId: booking.studioId,
      bookingId: booking.id,
    });
  }

  function resolveTargetStudioId(booking: ProjectBooking): string {
    return studioFilter !== "all" ? studioFilter : booking.studioId;
  }

  function canDropBookingAt(
    booking: ProjectBooking,
    date: string,
    slotId: BookingSlotId,
  ): boolean {
    const targetStudioId = resolveTargetStudioId(booking);
    if (
      booking.date === date &&
      booking.slotId === slotId &&
      booking.studioId === targetStudioId
    ) {
      return false;
    }

    return isSlotAvailable(targetStudioId, date, slotId, booking.id);
  }

  function beginDrag(bookingId: string, event: DragEvent) {
    event.stopPropagation();
    setDragBookingId(bookingId);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", bookingId);
  }

  function endDrag() {
    setDragBookingId(null);
    setDropTarget(null);
    setMonthDropTargetDate(null);
  }

  function handleMonthDayDrop(targetDay: Date) {
    setMonthDropTargetDate(null);
    if (!dragBookingId) {
      return;
    }

    const date = toDateKey(targetDay);
    const booking = bookings.find((entry) => entry.id === dragBookingId);
    setDragBookingId(null);

    if (!booking) {
      return;
    }

    if (!canDropBookingAt(booking, date, booking.slotId)) {
      if (booking.date !== date) {
        toast.error("Studio already booked.");
      }
      return;
    }

    try {
      rescheduleBooking(
        booking.id,
        date,
        booking.slotId,
        studioFilter !== "all" ? studioFilter : undefined,
      );
      toast.success("Booking moved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not move booking");
    }
  }

  function handleDropOnDateKey(dateKey: string, slotId: BookingSlotId) {
    setDropTarget(null);
    if (!dragBookingId) {
      return;
    }

    const booking = bookings.find((entry) => entry.id === dragBookingId);
    setDragBookingId(null);

    if (!booking) {
      return;
    }

    if (!canDropBookingAt(booking, dateKey, slotId)) {
      toast.error("Studio already booked.");
      return;
    }

    try {
      rescheduleBooking(
        booking.id,
        dateKey,
        slotId,
        studioFilter !== "all" ? studioFilter : undefined,
      );
      toast.success("Booking rescheduled");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reschedule booking");
    }
  }

  function handleDrop(day: Date, slotId: BookingSlotId) {
    handleDropOnDateKey(toDateKey(day), slotId);
  }

  function canOpenWizard(day: Date, slotId: BookingSlotId): boolean {
    const date = toDateKey(day);
    const activeStudios = studios.filter((studio) => studio.active);

    if (activeStudios.length === 0) {
      return false;
    }

    if (studioFilter !== "all") {
      return isSlotAvailable(studioFilter, date, slotId);
    }

    return activeStudios.some((studio) => isSlotAvailable(studio.id, date, slotId));
  }

  function openWizard(day: Date, slotId: BookingSlotId) {
    const date = toDateKey(day);
    const activeStudios = studios.filter((studio) => studio.active);

    if (activeStudios.length === 0) {
      toast.error("Add a studio in Settings before booking.");
      return;
    }

    if (!canOpenWizard(day, slotId)) {
      toast.error("All studios are booked for this slot.");
      return;
    }

    const studioId =
      studioFilter !== "all"
        ? studioFilter
        : activeStudios.find((studio) => isSlotAvailable(studio.id, date, slotId))?.id ??
          activeStudios[0].id;

    setWizardTarget({ date, slotId, studioId });
  }

  function renderSlotCell(day: Date, slot: (typeof slots)[number], dateKey: string) {
    const cellBookings = bookingsForDaySlot(day, slot.id);
    const isDropTarget = dropTarget?.date === dateKey && dropTarget.slotId === slot.id;
    const canBook = canOpenWizard(day, slot.id);

    return (
      <div
        key={slot.id}
        role={canBook ? "button" : undefined}
        tabIndex={canBook ? 0 : undefined}
        onClick={() => {
          if (canBook && !dragBookingId) {
            openWizard(day, slot.id);
          }
        }}
        onKeyDown={(event) => {
          if (canBook && !dragBookingId && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault();
            openWizard(day, slot.id);
          }
        }}
        onDragOver={(event) => {
          if (!dragBookingId) {
            return;
          }

          const booking = bookings.find((entry) => entry.id === dragBookingId);
          if (!booking || !canDropBookingAt(booking, dateKey, slot.id)) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget({ date: dateKey, slotId: slot.id });
        }}
        onDragLeave={() => setDropTarget(null)}
        onDrop={(event) => {
          event.preventDefault();
          handleDrop(day, slot.id);
        }}
        className={cn(
          "space-y-2 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors",
          isDropTarget && "border-primary/50 bg-primary/10",
          canBook &&
            !dragBookingId &&
            "cursor-pointer hover:border-primary/40 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        )}
      >
        <p className="text-xs font-medium text-muted-foreground">{slot.label}</p>
        {cellBookings.map((booking) => {
          const bookingStudio = studios.find((s) => s.id === booking.studioId);

          return (
            <div
              key={booking.id}
              role="button"
              tabIndex={0}
              draggable
              onClick={(event) => {
                event.stopPropagation();
                openEditWizard(booking);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.stopPropagation();
                  openEditWizard(booking);
                }
              }}
              onDragStart={(event) => beginDrag(booking.id, event)}
              onDragEnd={endDrag}
              className={cn(
                "cursor-grab rounded-lg border p-2 transition-colors active:cursor-grabbing",
                dragBookingId === booking.id
                  ? "opacity-50"
                  : "border-primary/20 bg-primary/5 hover:bg-primary/10",
              )}
              style={{
                borderLeftColor: bookingStudio?.color ?? undefined,
                borderLeftWidth: bookingStudio ? "3px" : undefined,
              }}
            >
              <p className="text-sm font-medium">{booking.projectName}</p>
              <p className="text-xs text-muted-foreground">{booking.bookingFor}</p>
              <p className="text-xs text-muted-foreground">{bookingStudio?.name}</p>
              <Badge
                variant={booking.status === "draft" ? "outline" : "success"}
                className="mt-2"
              >
                {BOOKING_STATUS_LABELS[booking.status]}
              </Badge>
            </div>
          );
        })}
        {canBook && !dragBookingId ? (
          <p className="text-xs text-muted-foreground">
            {cellBookings.length === 0 ? "Click to book" : "Click empty area to book"}
          </p>
        ) : null}
      </div>
    );
  }

  function renderDayColumn(day: Date) {
    const isToday = isSameDayString(day, toDateKey(new Date()));
    const dateKey = toDateKey(day);

    return (
      <Card
        key={day.toISOString()}
        className={cn(
          "min-h-[32rem] min-w-[15rem] flex-1 overflow-hidden border-border/60 shadow-md",
          isToday && "ring-2 ring-primary/30",
        )}
      >
        <CardHeader className="border-b border-border/50 bg-gradient-to-b from-primary/5 to-transparent pb-4">
          <CardTitle className="text-base">{formatDayLabel(day)}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-4">
          {slots.map((slot) => renderSlotCell(day, slot, dateKey))}
          <div className="pt-1">
            {expandedCustomSlotDay === dateKey ? (
              <DayCustomSlotInlineForm
                dateKey={dateKey}
                studioFilter={studioFilter}
                studios={activeStudios}
                onCancel={() => setExpandedCustomSlotDay(null)}
                onSaved={() => setExpandedCustomSlotDay(null)}
              />
            ) : (
              <AddCustomSlotButton onClick={() => setExpandedCustomSlotDay(dateKey)} />
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const periodLabel =
    effectiveView === "today"
      ? formatDayLabel(anchorDate)
      : effectiveView === "month"
        ? formatMonthYear(anchorDate)
        : `${formatDayLabel(weekDays[0])} – ${formatDayLabel(weekDays[6])}`;

  const jumpLabel =
    effectiveView === "today" ? "Today" : effectiveView === "month" ? "This month" : "This week";

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to manage bookings.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="page-container flex flex-col gap-6">
      <div>
        <h1 className="page-title">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          Project-owned studio bookings. Click an empty slot to book, or drag to reschedule.
        </p>
        {bookings.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No bookings yet.</p>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-border/60 p-1">
          {(["today", "week", "month"] as CalendarView[])
            .filter((option) => !isMobileViewport || option !== "week")
            .map((option) => (
            <Button
              key={option}
              type="button"
              size="sm"
              variant={effectiveView === option ? "default" : "ghost"}
              onClick={() => setView(option)}
            >
              {viewLabel(option)}
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Studio</span>
          <select
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm"
            value={studioFilter}
            onChange={(event) => setStudioFilter(event.target.value)}
          >
            <option value="all">All Studios</option>
            {studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="icon" onClick={() => shiftPeriod(-1)}>
          <ChevronLeftIcon className="size-4" />
        </Button>
        <Button type="button" variant="outline" size="icon" onClick={() => shiftPeriod(1)}>
          <ChevronRightIcon className="size-4" />
        </Button>
        <span className="text-sm font-medium">{periodLabel}</span>
        <Button type="button" variant="ghost" size="sm" onClick={jumpToToday}>
          {jumpLabel}
        </Button>
      </div>

      {effectiveView === "month" ? (
        <BookingsMonthView
          anchorDate={anchorDate}
          bookings={visibleBookings}
          studios={studios}
          dragBookingId={dragBookingId}
          dropTargetDate={monthDropTargetDate}
          onDayClick={(day) => setDayPanelDate(toDateKey(day))}
          onBookingClick={(booking, event) => {
            event.stopPropagation();
            openEditWizard(booking);
          }}
          onDragStart={beginDrag}
          onDragEnd={endDrag}
          onDayDragOver={(dateKey, event) => {
            if (!dragBookingId) {
              return;
            }

            const booking = bookings.find((entry) => entry.id === dragBookingId);
            if (!booking || !canDropBookingAt(booking, dateKey, booking.slotId)) {
              return;
            }

            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            setMonthDropTargetDate(dateKey);
          }}
          onDayDragLeave={() => setMonthDropTargetDate(null)}
          onDayDrop={(day, event) => {
            event.preventDefault();
            event.stopPropagation();
            handleMonthDayDrop(day);
          }}
        />
      ) : (
        <div className="table-scroll pb-2">
          <div className={cn("flex gap-4", effectiveView === "week" && "min-w-[1120px]")}>
            {displayDays.map((day) => renderDayColumn(day))}
          </div>
        </div>
      )}

      <BookingDayScheduleModal
        date={dayPanelDate}
        open={dayPanelDate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDayPanelDate(null);
            setExpandedCustomSlotDay(null);
          }
        }}
        slots={slots}
        bookings={dayPanelDate ? bookingsForDate(dayPanelDate) : []}
        studios={studios}
        studioFilter={studioFilter}
        activeStudios={activeStudios}
        dragBookingId={dragBookingId}
        dropTargetSlotId={dayPanelDate && dropTarget?.date === dayPanelDate ? dropTarget.slotId : null}
        expandedCustomSlot={dayPanelDate !== null && expandedCustomSlotDay === dayPanelDate}
        canBookSlot={(slotId) => (dayPanelDate ? canBookSlotForDateKey(dayPanelDate, slotId) : false)}
        canDropOnSlot={(slotId) => {
          if (!dragBookingId || !dayPanelDate) {
            return false;
          }

          const booking = bookings.find((entry) => entry.id === dragBookingId);
          return booking ? canDropBookingAt(booking, dayPanelDate, slotId) : false;
        }}
        onBookSlot={(slotId) => {
          if (dayPanelDate) {
            openWizardForDateKey(dayPanelDate, slotId);
          }
        }}
        onEditBooking={openEditWizard}
        onDragStart={beginDrag}
        onDragEnd={endDrag}
        onSlotDragOver={(slotId, event) => {
          if (!dayPanelDate) {
            return;
          }

          event.preventDefault();
          event.dataTransfer.dropEffect = "move";
          setDropTarget({ date: dayPanelDate, slotId });
        }}
        onSlotDragLeave={() => setDropTarget(null)}
        onSlotDrop={(slotId, event) => {
          event.preventDefault();
          event.stopPropagation();
          if (dayPanelDate) {
            handleDropOnDateKey(dayPanelDate, slotId);
          }
        }}
        onExpandCustomSlot={() => {
          if (dayPanelDate) {
            setExpandedCustomSlotDay(dayPanelDate);
          }
        }}
        onCollapseCustomSlot={() => setExpandedCustomSlotDay(null)}
      />

      {wizardTarget ? (
        <BookingWizardDialog
          open
          onOpenChange={(open) => {
            if (!open) {
              setWizardTarget(null);
            }
          }}
          initialDate={wizardTarget.date}
          initialSlotId={wizardTarget.slotId}
          initialStudioId={wizardTarget.studioId}
          bookingId={wizardTarget.bookingId}
        />
      ) : null}
    </div>
  );
}
