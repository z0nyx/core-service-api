import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthController } from "./auth.controller";
import { AuthJwtService } from "./auth-jwt.service";
import { AuthRefreshTokenService } from "./auth-refresh-token.service";
import { PasswordHashingService } from "./password-hashing.service";

@Module({
  controllers: [AuthController],
  providers: [PrismaService, PasswordHashingService, AuthJwtService, AuthRefreshTokenService],
  exports: [PasswordHashingService, AuthJwtService, AuthRefreshTokenService]
})
export class AuthModule {}
