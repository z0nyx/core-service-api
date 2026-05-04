import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthJwtService } from "./auth-jwt.service";
import { PasswordHashingService } from "./password-hashing.service";

@Module({
  controllers: [AuthController],
  providers: [PasswordHashingService, AuthJwtService],
  exports: [PasswordHashingService, AuthJwtService]
})
export class AuthModule {}
