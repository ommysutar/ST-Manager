import OpenAI from "openai";

import { AiProviderError, type AiProvider, type CompletionResult } from "../types/completion";

export interface OpenAiProviderConfig {
  apiKey: string;
  model: string;
}

export function createOpenAiProvider(config: OpenAiProviderConfig): AiProvider {
  const client = new OpenAI({ apiKey: config.apiKey });

  return {
    async complete(prompt: string): Promise<CompletionResult> {
      try {
        const response = await client.chat.completions.create({
          model: config.model,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        });

        const text = response.choices[0]?.message?.content?.trim();

        if (!text) {
          throw new AiProviderError("OpenAI returned an empty completion");
        }

        return {
          text,
          model: response.model ?? config.model,
        };
      } catch (error) {
        if (error instanceof AiProviderError) {
          throw error;
        }

        const message = error instanceof Error ? error.message : "OpenAI request failed";
        throw new AiProviderError(message);
      }
    },
  };
}
