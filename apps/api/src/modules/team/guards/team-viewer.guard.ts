import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { TEAM_ROLES } from "@st-manager/constants";

import type { AuthenticatedUser } from "../../auth/auth.types";

/** Owner and manager may view team membership. */
@Injectable()
export class TeamViewerGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user: AuthenticatedUser }>();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    if (user.role === TEAM_ROLES.OWNER || user.role === TEAM_ROLES.MANAGER) {
      return true;
    }

    throw new ForbiddenException("You do not have permission to view team members");
  }
}
