"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@st-manager/ui";
import { GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { AccessDenied } from "@/components/roles/AccessDenied";
import { useAuth } from "@/hooks/useAuth";
import { useBookingSlots } from "@/hooks/useBookingSlots";
import { usePermissions } from "@/hooks/usePermissions";
import { layout } from "@st-manager/theme";
import {
  createSlot,
  deleteSlot,
  reorderSlots,
  updateSlot,
} from "@/lib/bookings/slot-storage";
import {
  formatSlotTimeRange,
  parseTimeInputValue,
  timeInputFromSlot,
} from "@/lib/bookings/slot-utils";
import type { BookingSlot } from "@/lib/bookings/types";

function SlotEditDialog({
  slot,
  open,
  onOpenChange,
}: {
  slot: BookingSlot | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [label, setLabel] = useState(slot?.label ?? "");
  const [start, setStart] = useState(
    slot ? timeInputFromSlot(slot.startHour, slot.startMinute) : "09:00",
  );
  const [end, setEnd] = useState(
    slot ? timeInputFromSlot(slot.endHour, slot.endMinute) : "10:00",
  );

  function handleSave() {
    if (!slot) {
      return;
    }
    if (!label.trim()) {
      toast.error("Slot name is required");
      return;
    }

    const startTime = parseTimeInputValue(start);
    const endTime = parseTimeInputValue(end);

    try {
      updateSlot(slot.id, {
        label: label.trim(),
        startHour: startTime.hour,
        startMinute: startTime.minute,
        endHour: endTime.hour,
        endMinute: endTime.minute,
      });
      toast.success("Slot updated");
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update slot");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Booking Slot</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-slot-label">Slot Name *</Label>
            <Input
              id="edit-slot-label"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="edit-slot-start">Start Time *</Label>
              <Input
                id="edit-slot-start"
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-slot-end">End Time *</Label>
              <Input
                id="edit-slot-end"
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                required
              />
            </div>
          </div>
          <Button type="button" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function BookingSlotSettingsPageClient() {
  const { isAuthenticated } = useAuth();
  const { canAccessSettings } = usePermissions();
  const slots = useBookingSlots();
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [editingSlot, setEditingSlot] = useState<BookingSlot | null>(null);
  const [dragSlotId, setDragSlotId] = useState<string | null>(null);
  const [dropSlotId, setDropSlotId] = useState<string | null>(null);

  const orderedSlots = useMemo(() => [...slots], [slots]);

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to manage booking slots.</p>
        </CardContent>
      </Card>
    );
  }

  if (!canAccessSettings()) {
    return <AccessDenied message="Only the studio owner can access booking slot settings." />;
  }

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) {
      toast.error("Slot name is required");
      return;
    }

    const startTime = parseTimeInputValue(start);
    const endTime = parseTimeInputValue(end);

    try {
      createSlot({
        label: label.trim(),
        startHour: startTime.hour,
        startMinute: startTime.minute,
        endHour: endTime.hour,
        endMinute: endTime.minute,
        isCustom: false,
      });
      setLabel("");
      toast.success("Booking slot created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create slot");
    }
  }

  function handleDelete(slot: BookingSlot) {
    if (!window.confirm(`Delete slot "${slot.label}"?`)) {
      return;
    }

    try {
      deleteSlot(slot.id);
      toast.success("Slot deleted");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete slot");
    }
  }

  function handleDrop(targetId: string) {
    if (!dragSlotId || dragSlotId === targetId) {
      setDragSlotId(null);
      setDropSlotId(null);
      return;
    }

    const ids = orderedSlots.map((slot) => slot.id);
    const fromIndex = ids.indexOf(dragSlotId);
    const toIndex = ids.indexOf(targetId);
    if (fromIndex === -1 || toIndex === -1) {
      return;
    }

    ids.splice(fromIndex, 1);
    ids.splice(toIndex, 0, dragSlotId);

    try {
      reorderSlots(ids);
      toast.success("Slot order saved");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not reorder slots");
    } finally {
      setDragSlotId(null);
      setDropSlotId(null);
    }
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/settings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Booking Slot Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure time slots used by Week View, Month View, and the day schedule. Drag to reorder.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configured Slots</CardTitle>
          <CardDescription>{orderedSlots.length} slots · used across all booking calendars</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {orderedSlots.map((slot) => (
            <div
              key={slot.id}
              draggable
              onDragStart={() => setDragSlotId(slot.id)}
              onDragOver={(event) => {
                event.preventDefault();
                setDropSlotId(slot.id);
              }}
              onDragLeave={() => setDropSlotId(null)}
              onDrop={(event) => {
                event.preventDefault();
                handleDrop(slot.id);
              }}
              onDragEnd={() => {
                setDragSlotId(null);
                setDropSlotId(null);
              }}
              className={`flex items-center gap-3 rounded-xl border border-border/60 bg-background/60 p-3 transition-colors ${dropSlotId === slot.id ? "border-primary/50 bg-primary/5" : ""} ${dragSlotId === slot.id ? "opacity-50" : ""}`}
            >
              <GripVerticalIcon className="size-4 shrink-0 cursor-grab text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium">{slot.label}</p>
                <p className="text-sm text-muted-foreground">{formatSlotTimeRange(slot)}</p>
              </div>
              <Badge variant="outline">{slot.sortOrder + 1}</Badge>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingSlot(slot)}
                  aria-label="Edit slot"
                >
                  <PencilIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(slot)}
                  aria-label="Delete slot"
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Booking Slot</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="slot-label">Slot Name *</Label>
              <Input
                id="slot-label"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="Morning Session"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-start">Start Time *</Label>
              <Input
                id="slot-start"
                type="time"
                value={start}
                onChange={(event) => setStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end">End Time *</Label>
              <Input
                id="slot-end"
                type="time"
                value={end}
                onChange={(event) => setEnd(event.target.value)}
                required
              />
            </div>
            <div>
              <Button type="submit">
                <PlusIcon className="size-4" />
                Add Slot
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <SlotEditDialog
        key={editingSlot?.id ?? "none"}
        slot={editingSlot}
        open={editingSlot !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingSlot(null);
          }
        }}
      />
    </div>
  );
}
