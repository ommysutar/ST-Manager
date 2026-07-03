import { ApiError } from "@st-manager/api-sdk";
import { Button, Card, CardContent } from "@st-manager/ui";
import { useState } from "react";

import { aiApi } from "../../lib/api-client";

export interface StudioSummaryActionsProps {
  studioId: string;
  name: string;
  disabled?: boolean;
}

export function StudioSummaryActions({ studioId, name, disabled }: StudioSummaryActionsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await aiApi.generateStudioSummary({ studioId, name });
      setSummary(result.summary);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : "Failed to generate summary";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Button
        variant="outline"
        size="sm"
        disabled={disabled || isLoading}
        onClick={() => void handleGenerate()}
      >
        {isLoading ? "Generating..." : "Generate summary"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {summary ? (
        <Card>
          <CardContent className="pt-4">
            <p className="text-sm text-muted-foreground">{summary}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
