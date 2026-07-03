import type { AiProvider } from "../types/completion";
import { AiProviderError } from "../types/completion";
import { buildStudioSummaryPrompt } from "../prompts/studio-summary";

export interface StudioSummaryPipelineInput {
  studioId: string;
  name: string;
}

export interface StudioSummaryPipelineResult {
  summary: string;
}

export async function runStudioSummaryPipeline(
  input: StudioSummaryPipelineInput,
  provider: AiProvider,
): Promise<StudioSummaryPipelineResult> {
  const prompt = buildStudioSummaryPrompt({ name: input.name });

  let completion;

  try {
    completion = await provider.complete(prompt);
  } catch (error) {
    if (error instanceof AiProviderError) {
      throw error;
    }

    throw new AiProviderError(error instanceof Error ? error.message : "AI provider failed");
  }

  const summary = completion.text.trim();

  if (!summary) {
    throw new AiProviderError("AI provider returned an empty summary");
  }

  return { summary };
}
