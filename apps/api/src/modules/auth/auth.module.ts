import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import type { ApiEnv } from "@st-manager/validation";

import { PrismaModule } from "../../common/prisma/prisma.module";
import { AuthController } from "./auth.controller";
import { AuthRepository } from "./auth.repository";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "./jwt.strategy";

@Module({
  imports: [
    PrismaModule,
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<ApiEnv, true>) => ({
        secret: configService.get("AUTH_SECRET", { infer: true }),
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthRepository, AuthService, JwtStrategy, JwtAuthGuard],
  exports: [JwtAuthGuard, JwtModule, AuthService, AuthRepository],
})
export class AuthModule {}
