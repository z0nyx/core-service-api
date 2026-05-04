import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { APP_GUARD } from "@nestjs/core";
import { HealthController } from "./health.controller";
import { PrismaService } from "./prisma.service";
import { REDIS_CLIENT, redisProvider } from "./redis.provider";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 100
      }
    ])
  ],
  controllers: [HealthController],
  providers: [
    PrismaService,
    redisProvider,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ],
  exports: [PrismaService, REDIS_CLIENT]
})
export class AppModule {}
