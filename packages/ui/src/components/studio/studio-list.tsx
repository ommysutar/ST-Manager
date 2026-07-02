import type { Studio } from "@st-manager/types";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";

export interface StudioListProps {
  studios: Studio[];
  emptyMessage?: string;
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(date);
}

/**
 * Presentational only — no data fetching, no `@st-manager/api-sdk` import.
 * The consuming app (M7 desktop, M8 web) owns fetching `Studio[]` and
 * passes it in as a prop, so this component works unmodified regardless
 * of which data-fetching strategy each app chooses.
 */
export function StudioList({
  studios,
  emptyMessage = "No studios yet. Create the first one to get started.",
}: StudioListProps) {
  if (studios.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div data-slot="studio-list" className="flex flex-col gap-3">
      {studios.map((studio) => (
        <Card key={studio.id}>
          <CardHeader>
            <CardTitle>{studio.name}</CardTitle>
            <CardDescription>Created {formatDate(studio.createdAt)}</CardDescription>
          </CardHeader>
        </Card>
      ))}
    </div>
  );
}
