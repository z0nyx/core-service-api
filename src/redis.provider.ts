import { Provider } from "@nestjs/common";
import Redis from "ioredis";

export const REDIS_CLIENT = "REDIS_CLIENT";

export const redisProvider: Provider = {
  provide: REDIS_CLIENT,
  useFactory: () => {
    const redisUrl = process.env.REDIS_URL ?? "redis://localhost:6379";
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 1
    });
  }
};
