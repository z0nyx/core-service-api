import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { AuthJwtService } from "../auth/auth-jwt.service";
import { PrismaService } from "../prisma.service";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly authJwtService: AuthJwtService,
    private readonly prismaService: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);
    const tokenPayload = this.authJwtService.verifyToken(token);

    const roles = await this.loadUserRoleCodes(tokenPayload.sub);
    request.user = {
      id: tokenPayload.sub,
      email: tokenPayload.email,
      roles
    };

    if (roles.some((role) => requiredRoles.includes(role))) {
      return true;
    }

    throw new ForbiddenException("Insufficient role");
  }

  private extractBearerToken(request: Request): string {
    const authorization = request.headers.authorization;
    if (!authorization || typeof authorization !== "string") {
      throw new UnauthorizedException("Authorization header is missing");
    }

    const [scheme, token] = authorization.split(" ");
    if (scheme?.toLowerCase() !== "bearer" || !token) {
      throw new UnauthorizedException("Invalid authorization header");
    }

    return token;
  }

  private async loadUserRoleCodes(userId: string): Promise<string[]> {
    const userRoles = await this.prismaService.userRole.findMany({
      where: {
        userId
      },
      select: {
        role: {
          select: {
            code: true
          }
        }
      }
    });

    return userRoles.map(({ role }) => role.code);
  }
}
