export interface CompletionResult {
  text: string;
  model?: string;
}

export interface AiProvider {
  complete(prompt: string): Promise<CompletionResult>;
}

export class AiProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderError";
  }
}
