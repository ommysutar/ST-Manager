"use client";

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
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
import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/useAuth";
import { useStudios } from "@/hooks/useStudios";
import { layout } from "@st-manager/theme";
import { createStudio, updateStudio } from "@/lib/studios/storage";
import type { StudioRoom } from "@/lib/studios/types";

export function StudiosSettingsPageClient() {
  const { isAuthenticated } = useAuth();
  const studios = useStudios();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleCreate(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      toast.error("Studio name is required");
      return;
    }

    createStudio({ name, description, active: true });
    setName("");
    setDescription("");
    toast.success("Studio created");
  }

  function handleToggleActive(studio: StudioRoom, active: boolean) {
    updateStudio(studio.id, { active });
    toast.success(active ? "Studio activated" : "Studio deactivated");
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
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studios.map((studio) => (
                <TableRow key={studio.id}>
                  <TableCell className="font-medium">{studio.name}</TableCell>
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
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
