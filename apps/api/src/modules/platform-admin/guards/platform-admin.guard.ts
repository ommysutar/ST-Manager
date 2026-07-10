import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PLATFORM_ROLES } from "@st-manager/constants";

import type { AuthenticatedUser } from "../../auth/auth.types";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;

    if (!user || user.role !== PLATFORM_ROLES.PLATFORM_ADMIN) {
      throw new ForbiddenException("Platform admin access required");
    }

    return true;
  }
}
