import { Logger, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import type { ApiEnv } from "@st-manager/validation";

import { ConsoleEmailProvider } from "./providers/console-email.provider";
import { NoopEmailProvider } from "./providers/noop-email.provider";
import { ResendEmailProvider } from "./providers/resend-email.provider";
import { EmailService } from "./email.service";
import { EMAIL_PROVIDER, EMAIL_PROVIDER_ID } from "./email.types";

const moduleLogger = new Logger("EmailModule");
const EMAIL_RESOLUTION = Symbol("EMAIL_RESOLUTION");

@Module({
  imports: [ConfigModule],
  providers: [
    EmailService,
    ConsoleEmailProvider,
    NoopEmailProvider,
    ResendEmailProvider,
    {
      provide: EMAIL_RESOLUTION,
      inject: [ConfigService, ResendEmailProvider, ConsoleEmailProvider, NoopEmailProvider],
      useFactory: (
        configService: ConfigService<ApiEnv, true>,
        resendProvider: ResendEmailProvider,
        consoleProvider: ConsoleEmailProvider,
        noopProvider: NoopEmailProvider,
      ) => {
        const selected = configService.get("EMAIL_PROVIDER", { infer: true });

        if (selected === "noop") {
          moduleLogger.log("Email provider selected: noop (delivery disabled)");
          return { provider: noopProvider, id: noopProvider.id };
        }

        if (selected === "resend") {
          const apiKey = configService.get("RESEND_API_KEY", { infer: true });
          const from = configService.get("EMAIL_FROM", { infer: true });

          moduleLogger.log(`EMAIL_PROVIDER=${selected}`);
          moduleLogger.log(`RESEND_API_KEY detected: ${Boolean(apiKey)}`);
          moduleLogger.log(`EMAIL_FROM=${from ?? "(not set)"}`);
          moduleLogger.log(
            `APP_BASE_URL=${configService.get("APP_BASE_URL", { infer: true }) ?? "(not set)"}`,
          );

          if (!apiKey) {
            moduleLogger.warn(
              "WARNING: RESEND_API_KEY missing. Falling back to console email provider.",
            );
            return { provider: consoleProvider, id: consoleProvider.id };
          }

          if (!from) {
            moduleLogger.warn(
              "WARNING: EMAIL_FROM missing. Falling back to console email provider.",
            );
            return { provider: consoleProvider, id: consoleProvider.id };
          }

          moduleLogger.log("Email provider: Resend");
          return { provider: resendProvider, id: resendProvider.id };
        }

        moduleLogger.warn(
          "Email provider selected: console (stdout only — set EMAIL_PROVIDER=resend for real delivery)",
        );
        return { provider: consoleProvider, id: consoleProvider.id };
      },
    },
    {
      provide: EMAIL_PROVIDER,
      inject: [EMAIL_RESOLUTION],
      useFactory: (resolved: { provider: unknown }) => resolved.provider,
    },
    {
      provide: EMAIL_PROVIDER_ID,
      inject: [EMAIL_RESOLUTION],
      useFactory: (resolved: { id: string }) => resolved.id,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
