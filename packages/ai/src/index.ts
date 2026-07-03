import { createMockProvider } from "./providers/mock-provider";
import { createOpenAiProvider } from "./providers/openai-provider";
import type { AiProvider } from "./types/completion";

export type AiProviderKind = "openai" | "mock";

export interface CreateAiProviderConfig {
  provider: AiProviderKind;
  apiKey?: string;
  model: string;
}

export function createAiProvider(config: CreateAiProviderConfig): AiProvider {
  if (config.provider === "mock") {
    return createMockProvider();
  }

  if (!config.apiKey) {
    throw new Error("AI_API_KEY is required when AI_PROVIDER=openai");
  }

  return createOpenAiProvider({
    apiKey: config.apiKey,
    model: config.model,
  });
}

export { AiProviderError } from "./types/completion";
export type { AiProvider, CompletionResult } from "./types/completion";
export { buildStudioSummaryPrompt } from "./prompts/studio-summary";
export { runStudioSummaryPipeline } from "./pipelines/studio-summary.pipeline";
export type {
  StudioSummaryPipelineInput,
  StudioSummaryPipelineResult,
} from "./pipelines/studio-summary.pipeline";
