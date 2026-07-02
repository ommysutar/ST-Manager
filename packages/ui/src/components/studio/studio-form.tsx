"use client";

import * as React from "react";

import { Button } from "../ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../ui/card";
import { Input } from "../ui/input";

export interface StudioFormValues {
  name: string;
}

export interface StudioFormProps {
  onSubmit: (values: StudioFormValues) => void;
  isSubmitting?: boolean;
  error?: string;
}

/**
 * Presentational only — calls `onSubmit` with validated local state, never
 * `@st-manager/api-sdk` directly, so the consuming app (M7 desktop, M8
 * web) decides how the submission is actually persisted. `"use client"` is
 * required for Next.js's App Router (interactive component with local
 * state/handlers) and is a harmless no-op comment under Vite/desktop.
 */
export function StudioForm({ onSubmit, isSubmitting = false, error }: StudioFormProps) {
  const [name, setName] = React.useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    onSubmit({ name: trimmed });
  }

  return (
    <Card>
      <form onSubmit={handleSubmit}>
        <CardHeader>
          <CardTitle>New Studio</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Input
            name="name"
            placeholder="Studio name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={isSubmitting}
            aria-invalid={Boolean(error)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isSubmitting || name.trim().length === 0}>
            {isSubmitting ? "Creating..." : "Create Studio"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
