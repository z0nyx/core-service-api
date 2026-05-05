import { HttpException, HttpStatus, Inject, Injectable } from "@nestjs/common";
import type Redis from "ioredis";
import { REDIS_CLIENT } from "../redis.provider";

@Injectable()
export class AuthSecurityService {
  private readonly maxFailedAttempts = 5;
  private readonly attemptsWindowSeconds = 15 * 60;
  private readonly lockSeconds = 15 * 60;

  constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {}

  async ensureLoginNotLocked(loginKey: string) {
    const lockKey = this.buildLockKey(loginKey);
    const ttl = await this.redisClient.ttl(lockKey);

    if (ttl > 0) {
      throw new HttpException(`Too many failed login attempts. Retry in ${ttl} seconds`, HttpStatus.TOO_MANY_REQUESTS);
    }
  }

  async recordLoginFailure(loginKey: string) {
    const attemptsKey = this.buildAttemptsKey(loginKey);
    const lockKey = this.buildLockKey(loginKey);

    const attempts = await this.redisClient.incr(attemptsKey);
    if (attempts === 1) {
      await this.redisClient.expire(attemptsKey, this.attemptsWindowSeconds);
    }

    if (attempts >= this.maxFailedAttempts) {
      await this.redisClient.set(lockKey, "1", "EX", this.lockSeconds);
      await this.redisClient.del(attemptsKey);
    }
  }

  async clearLoginFailures(loginKey: string) {
    await this.redisClient.del(this.buildAttemptsKey(loginKey));
  }

  private buildAttemptsKey(loginKey: string) {
    return `auth:login:attempts:${loginKey.toLowerCase()}`;
  }

  private buildLockKey(loginKey: string) {
    return `auth:login:lock:${loginKey.toLowerCase()}`;
  }
}
