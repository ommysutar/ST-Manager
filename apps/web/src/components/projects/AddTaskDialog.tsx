"use client";

import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "@st-manager/ui";
import { PlusIcon } from "lucide-react";
import { useState } from "react";

interface AddTaskDialogProps {
  onAdd: (name: string) => void;
}

export function AddTaskDialog({ onAdd }: AddTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  function handleAdd() {
    if (!name.trim()) {
      return;
    }

    onAdd(name.trim());
    setName("");
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <PlusIcon className="size-4" />
          Add Task
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Custom Task</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="custom-task-name">Task Name</Label>
            <Input
              id="custom-task-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Artwork, Thumbnail, Client Revision..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleAdd}>
              Add Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
