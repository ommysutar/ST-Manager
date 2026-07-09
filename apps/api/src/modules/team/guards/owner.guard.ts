import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { TEAM_ROLES } from "@st-manager/constants";

import type { AuthenticatedUser } from "../../auth/auth.types";

@Injectable()
export class OwnerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (!user || user.role !== TEAM_ROLES.OWNER) {
      throw new ForbiddenException("Only the studio owner can perform this action");
    }

    return true;
  }
}
