import { ROUTES } from "@st-manager/constants";
import type {
  GenerateStudioSummaryRequestDto,
  GenerateStudioSummaryResponseDataDto,
  GenerateStudioSummaryResponseDto,
} from "@st-manager/contracts";
import { generateStudioSummarySchema } from "@st-manager/validation";

import type { HttpClient } from "../client/types";

export interface AiApi {
  generateStudioSummary(
    input: GenerateStudioSummaryRequestDto,
  ): Promise<GenerateStudioSummaryResponseDataDto>;
}

export function createAiApi(client: HttpClient): AiApi {
  return {
    generateStudioSummary: async (input) => {
      const validated = generateStudioSummarySchema.parse(input);
      const response = await client.post<GenerateStudioSummaryResponseDto>(
        `${ROUTES.AI}/studios/summary`,
        validated,
      );
      return response.data;
    },
  };
}
