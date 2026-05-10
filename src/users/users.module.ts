import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { PrismaService } from "../prisma.service";
import { RolesGuard } from "../rbac/roles.guard";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [PrismaService, UsersService, RolesGuard],
  exports: [UsersService]
})
export class UsersModule {}
