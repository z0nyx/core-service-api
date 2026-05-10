import { Module } from "@nestjs/common";
import { redisProvider } from "../redis.provider";
import { PrismaService } from "../prisma.service";
import { RolesGuard } from "../rbac/roles.guard";
import { AuthController } from "./auth.controller";
import { AuthJwtService } from "./auth-jwt.service";
import { AuthRefreshTokenService } from "./auth-refresh-token.service";
import { AuthSecurityService } from "./auth-security.service";
import { PasswordHashingService } from "./password-hashing.service";

@Module({
  controllers: [AuthController],
  providers: [
    redisProvider,
    PrismaService,
    PasswordHashingService,
    AuthJwtService,
    AuthRefreshTokenService,
    AuthSecurityService,
    RolesGuard
  ],
  exports: [PasswordHashingService, AuthJwtService, AuthRefreshTokenService, AuthSecurityService]
})
export class AuthModule {}
