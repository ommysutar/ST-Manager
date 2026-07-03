import { Injectable, ServiceUnavailableException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  AiProviderError,
  createAiProvider,
  runStudioSummaryPipeline,
  type AiProvider,
} from "@st-manager/ai";
import type { GenerateStudioSummaryResponseDataDto } from "@st-manager/contracts";
import type { GenerateStudioSummaryInput } from "@st-manager/validation";

@Injectable()
export class AiService {
  private readonly provider: AiProvider;

  constructor(private readonly configService: ConfigService) {
    this.provider = createAiProvider({
      provider: this.configService.get<"openai" | "mock">("AI_PROVIDER", "mock"),
      apiKey: this.configService.get<string>("AI_API_KEY"),
      model: this.configService.get<string>("AI_MODEL", "gpt-4o-mini"),
    });
  }

  async generateStudioSummary(
    input: GenerateStudioSummaryInput,
  ): Promise<GenerateStudioSummaryResponseDataDto> {
    try {
      return await runStudioSummaryPipeline(input, this.provider);
    } catch (error) {
      if (error instanceof AiProviderError) {
        throw new ServiceUnavailableException(error.message);
      }

      throw error;
    }
  }
}
