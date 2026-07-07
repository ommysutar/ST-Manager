"use client";

import { Button, Input, Label } from "@st-manager/ui";
import { PlusIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { createCustomSlot } from "@/lib/bookings/slot-storage";
import { parseTimeInputValue } from "@/lib/bookings/slot-utils";
import type { StudioRoom } from "@/lib/studios/types";

interface DayCustomSlotInlineFormProps {
  dateKey: string;
  studioFilter: string;
  studios: StudioRoom[];
  onCancel: () => void;
  onSaved: () => void;
}

export function DayCustomSlotInlineForm({
  dateKey,
  studioFilter,
  studios,
  onCancel,
  onSaved,
}: DayCustomSlotInlineFormProps) {
  const [label, setLabel] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:30");
  const [studioId, setStudioId] = useState(
    studioFilter !== "all" ? studioFilter : studios[0]?.id ?? "",
  );

  const showStudioField = studioFilter === "all" && studios.length > 0;
  const filteredStudio = studioFilter !== "all"
    ? studios.find((studio) => studio.id === studioFilter)
    : null;

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!label.trim()) {
      toast.error("Slot label is required");
      return;
    }

    const startTime = parseTimeInputValue(start);
    const endTime = parseTimeInputValue(end);

    try {
      createCustomSlot({
        label: label.trim(),
        startHour: startTime.hour,
        startMinute: startTime.minute,
        endHour: endTime.hour,
        endMinute: endTime.minute,
      });
      toast.success("Custom slot created");
      onSaved();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create slot");
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-2"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="space-y-1">
        <Label htmlFor={`custom-slot-label-${dateKey}`} className="text-xs">
          Label *
        </Label>
        <Input
          id={`custom-slot-label-${dateKey}`}
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          placeholder="9:00 AM – 10:30 AM"
          className="h-8 text-xs"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`custom-slot-start-${dateKey}`} className="text-xs">
            Start *
          </Label>
          <Input
            id={`custom-slot-start-${dateKey}`}
            type="time"
            value={start}
            onChange={(event) => setStart(event.target.value)}
            className="h-8 text-xs"
            required
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`custom-slot-end-${dateKey}`} className="text-xs">
            End *
          </Label>
          <Input
            id={`custom-slot-end-${dateKey}`}
            type="time"
            value={end}
            onChange={(event) => setEnd(event.target.value)}
            className="h-8 text-xs"
            required
          />
        </div>
      </div>

      {showStudioField ? (
        <div className="space-y-1">
          <Label htmlFor={`custom-slot-studio-${dateKey}`} className="text-xs">
            Studio
          </Label>
          <select
            id={`custom-slot-studio-${dateKey}`}
            className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-xs"
            value={studioId}
            onChange={(event) => setStudioId(event.target.value)}
          >
            {studios.map((studio) => (
              <option key={studio.id} value={studio.id}>
                {studio.name}
              </option>
            ))}
          </select>
        </div>
      ) : filteredStudio ? (
        <p className="text-xs text-muted-foreground">Studio: {filteredStudio.name}</p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Button type="submit" size="sm" className="h-7 flex-1 text-xs">
          Save
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 flex-1 text-xs" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

interface AddCustomSlotButtonProps {
  onClick: () => void;
}

export function AddCustomSlotButton({ onClick }: AddCustomSlotButtonProps) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-full text-xs text-muted-foreground hover:text-foreground"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <PlusIcon className="size-3" />
      Add Custom Slot
    </Button>
  );
}
