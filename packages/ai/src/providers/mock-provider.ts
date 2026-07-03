import type { AiProvider, CompletionResult } from "../types/completion";

export function createMockProvider(): AiProvider {
  return {
    async complete(prompt: string): Promise<CompletionResult> {
      const nameMatch = /named "([^"]+)"/.exec(prompt);
      const studioName = nameMatch?.[1] ?? "this studio";

      return {
        text: `${studioName} is a focused workspace for creative teams to plan, collaborate, and deliver projects efficiently. It brings together the tools studios need in one calm, organized environment. Ideal for boutique teams who value clarity and momentum.`,
        model: "mock",
      };
    },
  };
}
