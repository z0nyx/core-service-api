import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { PasswordHashingService } from "./password-hashing.service";

@Module({
  controllers: [AuthController],
  providers: [PasswordHashingService],
  exports: [PasswordHashingService]
})
export class AuthModule {}
