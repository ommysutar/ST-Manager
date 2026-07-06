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
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
} from "@st-manager/ui";
import { PencilIcon, PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useBookingSlots } from "@/hooks/useBookingSlots";
import { useStudios } from "@/hooks/useStudios";
import { layout } from "@st-manager/theme";
import { createCustomSlot, deleteCustomSlot } from "@/lib/bookings/slot-storage";
import type { BookingSlot } from "@/lib/bookings/types";
import { createStudio, deleteStudio, updateStudio } from "@/lib/studios/storage";
import { DEFAULT_STUDIO_COLOR } from "@/lib/studios/types";
import type { StudioRoom } from "@/lib/studios/types";

function formatSlotTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function parseTimeInputValue(value: string): { hour: number; minute: number } {
  const [hour, minute] = value.split(":").map((part) => Number.parseInt(part, 10));
  return { hour: hour || 0, minute: minute || 0 };
}

function StudioEditDialog({
  studio,
  open,
  onOpenChange,
}: {
  studio: StudioRoom | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [name, setName] = useState(studio?.name ?? "");
  const [roomName, setRoomName] = useState(studio?.roomName ?? "");
  const [description, setDescription] = useState(studio?.description ?? "");
  const [color, setColor] = useState(studio?.color ?? DEFAULT_STUDIO_COLOR);

  function handleSave() {
    if (!studio) {
      return;
    }
    if (!name.trim()) {
      toast.error("Studio name is required");
      return;
    }

    updateStudio(studio.id, { name, roomName: roomName.trim() || undefined, description, color });
    toast.success("Studio updated");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Studio</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="space-y-2">
            <Label htmlFor="edit-studio-name">Studio Name *</Label>
            <Input id="edit-studio-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-studio-room">Room Name</Label>
            <Input
              id="edit-studio-room"
              value={roomName}
              onChange={(event) => setRoomName(event.target.value)}
              placeholder="Optional — e.g. Booth 1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-studio-description">Description</Label>
            <Textarea
              id="edit-studio-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-studio-color">Color</Label>
            <div className="flex items-center gap-3">
              <input
                id="edit-studio-color"
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
              />
              <span className="text-sm text-muted-foreground">{color}</span>
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

export function StudiosSettingsPageClient() {
  const { isAuthenticated } = useAuth();
  const studios = useStudios();
  const slots = useBookingSlots();
  const [name, setName] = useState("");
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [color, setColor] = useState(DEFAULT_STUDIO_COLOR);
  const [editingStudio, setEditingStudio] = useState<StudioRoom | null>(null);

  const [slotLabel, setSlotLabel] = useState("");
  const [slotStart, setSlotStart] = useState("10:00");
  const [slotEnd, setSlotEnd] = useState("11:00");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Studio name is required");
      return;
    }

    createStudio({ name, roomName: roomName.trim() || undefined, description, color, active: true });
    setName("");
    setRoomName("");
    setDescription("");
    setColor(DEFAULT_STUDIO_COLOR);
    toast.success("Studio created");
  }

  function handleToggleActive(studio: StudioRoom, active: boolean) {
    updateStudio(studio.id, { active });
    toast.success(active ? "Studio activated" : "Studio deactivated");
  }

  function handleDelete(studio: StudioRoom) {
    if (!window.confirm(`Delete "${studio.name}"? Existing bookings will keep referencing this studio.`)) {
      return;
    }
    deleteStudio(studio.id);
    toast.success("Studio deleted");
  }

  function handleCreateSlot(event: React.FormEvent) {
    event.preventDefault();
    if (!slotLabel.trim()) {
      toast.error("Slot label is required");
      return;
    }

    const start = parseTimeInputValue(slotStart);
    const end = parseTimeInputValue(slotEnd);

    try {
      createCustomSlot({
        label: slotLabel,
        startHour: start.hour,
        startMinute: start.minute,
        endHour: end.hour,
        endMinute: end.minute,
      });
      setSlotLabel("");
      toast.success("Custom slot created");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create slot");
    }
  }

  function handleDeleteSlot(slot: BookingSlot) {
    if (!window.confirm(`Delete slot "${slot.label}"?`)) {
      return;
    }
    const deleted = deleteCustomSlot(slot.id);
    if (deleted) {
      toast.success("Slot deleted");
    }
  }

  if (!isAuthenticated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">Sign in to manage studios.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex flex-col gap-6" style={{ maxWidth: layout.contentMaxWidth }}>
      <div>
        <Link href="/settings" className="text-sm text-primary underline-offset-4 hover:underline">
          Back to settings
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Studios</h1>
        <p className="text-sm text-muted-foreground">
          Manage studio rooms used for project bookings. No hardcoded rooms.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Studio / Room</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreate} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="studio-name">Studio Name *</Label>
              <Input
                id="studio-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Recording Room"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studio-room">Room Name</Label>
              <Input
                id="studio-room"
                value={roomName}
                onChange={(event) => setRoomName(event.target.value)}
                placeholder="Optional — Voice Booth, Mix Room..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="studio-color">Color</Label>
              <div className="flex items-center gap-3">
                <input
                  id="studio-color"
                  type="color"
                  value={color}
                  onChange={(event) => setColor(event.target.value)}
                  className="h-9 w-14 cursor-pointer rounded border border-input bg-transparent p-1"
                />
                <span className="text-sm text-muted-foreground">{color}</span>
              </div>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="studio-description">Description</Label>
              <Textarea
                id="studio-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Optional room details"
                rows={2}
              />
            </div>
            <div>
              <Button type="submit">
                <PlusIcon className="size-4" />
                Add Studio
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All Studios</CardTitle>
          <CardDescription>{studios.length} rooms configured</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Room</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studios.map((studio) => (
                <TableRow key={studio.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        className="size-3 shrink-0 rounded-full border border-border/60"
                        style={{ backgroundColor: studio.color }}
                        aria-hidden
                      />
                      {studio.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{studio.roomName || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {studio.description || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Switch
                        checked={studio.active}
                        onCheckedChange={(checked) => handleToggleActive(studio, checked)}
                      />
                      <Badge variant={studio.active ? "success" : "secondary"}>
                        {studio.active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setEditingStudio(studio)}
                        aria-label="Edit studio"
                      >
                        <PencilIcon className="size-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleDelete(studio)}
                        aria-label="Delete studio"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <StudioEditDialog
        key={editingStudio?.id ?? "none"}
        studio={editingStudio}
        open={editingStudio !== null}
        onOpenChange={(open) => {
          if (!open) {
            setEditingStudio(null);
          }
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Booking Slots</CardTitle>
          <CardDescription>
            Default slots (11 AM–2 PM, 3 PM–6 PM, 7 PM–9 PM) plus any custom slots you create.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Label</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((slot) => (
                <TableRow key={slot.id}>
                  <TableCell className="font-medium">{slot.label}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatSlotTime(slot.startHour, slot.startMinute)} –{" "}
                    {formatSlotTime(slot.endHour, slot.endMinute)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={slot.isCustom ? "secondary" : "outline"}>
                      {slot.isCustom ? "Custom" : "Default"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {slot.isCustom ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => handleDeleteSlot(slot)}
                        aria-label="Delete slot"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <form
            onSubmit={handleCreateSlot}
            className="grid gap-4 border-t border-border/60 pt-4 sm:grid-cols-3"
          >
            <div className="space-y-2 sm:col-span-3">
              <Label htmlFor="slot-label">Custom Slot Label *</Label>
              <Input
                id="slot-label"
                value={slotLabel}
                onChange={(event) => setSlotLabel(event.target.value)}
                placeholder="9:00 AM – 10:30 AM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-start">Start Time *</Label>
              <Input
                id="slot-start"
                type="time"
                value={slotStart}
                onChange={(event) => setSlotStart(event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-end">End Time *</Label>
              <Input
                id="slot-end"
                type="time"
                value={slotEnd}
                onChange={(event) => setSlotEnd(event.target.value)}
                required
              />
            </div>
            <div className="flex items-end">
              <Button type="submit" className="w-full">
                <PlusIcon className="size-4" />
                Create Custom Slot
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
