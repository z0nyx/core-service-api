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
    const user = await this.resolveActiveUser(tokenPayload.sub, tokenPayload.email);
    const roles = await this.loadUserRoleCodes(user.id);
    request.user = {
      id: user.id,
      email: user.email,
      roles
    };

    if (roles.some((role) => requiredRoles.includes(role))) {
      return true;
    }

    throw new ForbiddenException("Insufficient role");
  }

  private async resolveActiveUser(sub: string, email: string): Promise<{ id: string; email: string }> {
    const normalizedSub = sub.trim();
    const normalizedEmail = email.trim().toLowerCase();

    const user = await this.prismaService.user.findFirst({
      where: {
        isActive: true,
        OR: [{ id: normalizedSub }, { email: normalizedEmail }]
      },
      select: {
        id: true,
        email: true
      }
    });

    if (!user) {
      throw new UnauthorizedException("User is not found or inactive");
    }

    const isLegacySubject = normalizedSub.toLowerCase() === normalizedEmail;
    const isCanonicalSubject = normalizedSub === user.id;
    if (!isLegacySubject && !isCanonicalSubject) {
      throw new UnauthorizedException("Token subject does not match user identity");
    }

    if (user.email.toLowerCase() !== normalizedEmail) {
      throw new UnauthorizedException("Token email does not match user identity");
    }

    return user;
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
