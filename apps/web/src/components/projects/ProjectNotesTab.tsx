"use client";

import { Button, Card, CardContent, CardHeader, CardTitle, Textarea } from "@st-manager/ui";
import { useState } from "react";
import { toast } from "sonner";

import { useProject } from "@/hooks/useProjects";
import { updateProject } from "@/lib/projects/storage";

interface ProjectNotesTabProps {
  projectId: string;
}

export function ProjectNotesTab({ projectId }: ProjectNotesTabProps) {
  const project = useProject(projectId);
  // `draft` shadows the persisted value only while the user is actively editing; once saved we
  // fall back to the live project snapshot instead of syncing local state from a prop in an effect.
  const [draft, setDraft] = useState<string | null>(null);

  if (!project) {
    return null;
  }

  const notes = draft ?? project.notes;
  const dirty = draft !== null && draft !== project.notes;

  function handleSave() {
    updateProject(projectId, { notes });
    setDraft(null);
    toast.success("Notes saved");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Project Notes</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Free-text notes visible to everyone with access to this project.
        </p>
        <Textarea
          rows={10}
          value={notes}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Add project notes, reminders, or context here..."
        />
        <Button type="button" onClick={handleSave} disabled={!dirty}>
          Save Notes
        </Button>
      </CardContent>
    </Card>
  );
}
