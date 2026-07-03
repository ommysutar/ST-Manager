import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ROUTES } from "@st-manager/constants";
import type { GenerateStudioSummaryResponseDto } from "@st-manager/contracts";
import { generateStudioSummarySchema, type GenerateStudioSummaryInput } from "@st-manager/validation";

import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AiService } from "./ai.service";

@Controller(ROUTES.AI)
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post("studios/summary")
  async generateStudioSummary(
    @Body(new ZodValidationPipe(generateStudioSummarySchema)) body: GenerateStudioSummaryInput,
  ): Promise<GenerateStudioSummaryResponseDto> {
    const data = await this.aiService.generateStudioSummary(body);
    return { success: true, data };
  }
}
