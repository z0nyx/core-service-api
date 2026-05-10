import "reflect-metadata";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma.service";
import { REDIS_CLIENT } from "../redis.provider";

type TokenRecord = {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

class InMemoryRedis {
  private store = new Map<string, string>();
  private expirations = new Map<string, number>();

  private purgeIfExpired(key: string) {
    const expiresAt = this.expirations.get(key);
    if (expiresAt && Date.now() > expiresAt) {
      this.store.delete(key);
      this.expirations.delete(key);
    }
  }

  async get(key: string) {
    this.purgeIfExpired(key);
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string, exMode?: string, seconds?: number) {
    this.store.set(key, value);
    if (exMode === "EX" && typeof seconds === "number") {
      this.expirations.set(key, Date.now() + seconds * 1000);
    }
    return "OK";
  }

  async incr(key: string) {
    this.purgeIfExpired(key);
    const current = Number(this.store.get(key) ?? "0");
    const next = current + 1;
    this.store.set(key, String(next));
    return next;
  }

  async expire(key: string, seconds: number) {
    this.purgeIfExpired(key);
    if (!this.store.has(key)) {
      return 0;
    }
    this.expirations.set(key, Date.now() + seconds * 1000);
    return 1;
  }

  async ttl(key: string) {
    this.purgeIfExpired(key);
    if (!this.store.has(key)) {
      return -2;
    }
    const expiresAt = this.expirations.get(key);
    if (!expiresAt) {
      return -1;
    }
    return Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
  }

  async del(key: string) {
    const existed = this.store.delete(key);
    this.expirations.delete(key);
    return existed ? 1 : 0;
  }
}

class InMemoryPrisma {
  private tokens: TokenRecord[] = [];
  private idCounter = 1;
  private users = [
    { id: "admin-id", email: "admin@example.com", isActive: true },
    { id: "user-id", email: "user@example.com", isActive: true }
  ];

  user = {
    findFirst: async ({ where }: { where: { isActive: boolean; OR: Array<{ id?: string; email?: string }> } }) => {
      if (!where.isActive) {
        return null;
      }

      return (
        this.users.find((user) =>
          where.OR.some((condition) => (condition.id ? user.id === condition.id : user.email === condition.email))
        ) ?? null
      );
    }
  };

  userRole = {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (where.userId === "admin-id") {
        return [{ role: { code: "admin" } }];
      }
      return [{ role: { code: "user" } }];
    }
  };

  refreshToken = {
    create: async ({ data }: { data: { userId: string; tokenHash: string; expiresAt: Date } }) => {
      const record: TokenRecord = {
        id: String(this.idCounter++),
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.tokens.push(record);
      return record;
    },

    findMany: async ({
      where,
      orderBy,
      take
    }: {
      where: { userId: string; revokedAt: null; expiresAt?: { gt: Date } };
      orderBy?: { createdAt: "desc" | "asc" };
      take?: number;
    }) => {
      let result = this.tokens.filter((token) => {
        if (token.userId !== where.userId) {
          return false;
        }
        if (where.revokedAt === null && token.revokedAt !== null) {
          return false;
        }
        if (where.expiresAt?.gt && !(token.expiresAt > where.expiresAt.gt)) {
          return false;
        }
        return true;
      });

      if (orderBy?.createdAt === "desc") {
        result = result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      if (orderBy?.createdAt === "asc") {
        result = result.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      }

      if (typeof take === "number") {
        result = result.slice(0, take);
      }

      return result;
    },

    update: async ({ where, data }: { where: { id: string }; data: { revokedAt: Date } }) => {
      const token = this.tokens.find((item) => item.id === where.id);
      if (!token) {
        throw new Error("Token not found");
      }
      token.revokedAt = data.revokedAt;
      token.updatedAt = new Date();
      return token;
    },

    updateMany: async ({
      where,
      data
    }: {
      where: { userId: string; revokedAt: null; expiresAt?: { gt: Date } };
      data: { revokedAt: Date };
    }) => {
      let count = 0;
      this.tokens.forEach((token) => {
        if (
          token.userId === where.userId &&
          token.revokedAt === null &&
          (!where.expiresAt?.gt || token.expiresAt > where.expiresAt.gt)
        ) {
          token.revokedAt = data.revokedAt;
          token.updatedAt = new Date();
          count += 1;
        }
      });
      return { count };
    }
  };
}

describe("Auth flows (e2e)", () => {
  let app: INestApplication;
  let adminAccessToken: string;
  const redis = new InMemoryRedis();
  const prisma = new InMemoryPrisma();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(REDIS_CLIENT)
      .useValue(redis)
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api");
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true
      })
    );

    await app.init();

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: "admin@example.com", password: "admin_password_123", name: "Admin" })
      .expect(201);

    const adminLoginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "admin_password_123" })
      .expect(201);

    adminAccessToken = adminLoginResponse.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("register + login + verify works", async () => {
    const email = "user1@example.com";
    const password = "strong_password_123";

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password, name: "User One" })
      .expect(201);

    const loginResponse = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password })
      .expect(201);

    expect(loginResponse.body.accessToken).toBeDefined();
    expect(loginResponse.body.refreshToken).toBeDefined();

    const verifyResponse = await request(app.getHttpServer())
      .post("/api/auth/token/verify")
      .send({ token: loginResponse.body.accessToken })
      .expect(201);

    expect(verifyResponse.body.payload.email).toBe(email);
  });

  it("refresh rotates token and invalidates previous refresh token", async () => {
    const issueResponse = await request(app.getHttpServer())
      .post("/api/auth/token/issue")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ email: "rotate@example.com", userId: "rotate-user" })
      .expect(201);

    const firstRefreshToken = issueResponse.body.refreshToken;

    const rotateResponse = await request(app.getHttpServer())
      .post("/api/auth/token/refresh")
      .send({ refreshToken: firstRefreshToken })
      .expect(201);

    expect(rotateResponse.body.accessToken).toBeDefined();
    expect(rotateResponse.body.refreshToken).toBeDefined();

    await request(app.getHttpServer())
      .post("/api/auth/token/refresh")
      .send({ refreshToken: firstRefreshToken })
      .expect(401);
  });

  it("logout revokes single session", async () => {
    const issueResponse = await request(app.getHttpServer())
      .post("/api/auth/token/issue")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ email: "logout@example.com", userId: "logout-user" })
      .expect(201);

    const refreshToken = issueResponse.body.refreshToken;

    const logoutResponse = await request(app.getHttpServer())
      .post("/api/auth/token/logout")
      .send({ refreshToken })
      .expect(201);

    expect(logoutResponse.body.success).toBe(true);

    await request(app.getHttpServer())
      .post("/api/auth/token/refresh")
      .send({ refreshToken })
      .expect(401);
  });

  it("logout-all revokes all active sessions", async () => {
    const first = await request(app.getHttpServer())
      .post("/api/auth/token/issue")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ email: "all@example.com", userId: "all-user" })
      .expect(201);

    const second = await request(app.getHttpServer())
      .post("/api/auth/token/issue")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ email: "all@example.com", userId: "all-user" })
      .expect(201);

    const logoutAllResponse = await request(app.getHttpServer())
      .post("/api/auth/token/logout-all")
      .send({ refreshToken: first.body.refreshToken })
      .expect(201);

    expect(logoutAllResponse.body.success).toBe(true);
    expect(logoutAllResponse.body.revokedCount).toBeGreaterThanOrEqual(2);

    await request(app.getHttpServer())
      .post("/api/auth/token/refresh")
      .send({ refreshToken: first.body.refreshToken })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/auth/token/refresh")
      .send({ refreshToken: second.body.refreshToken })
      .expect(401);
  });

  it("blocks login after repeated failed attempts", async () => {
    const email = "lock@example.com";

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email, password: "valid_password_123", name: "Lock User" })
      .expect(201);

    for (let i = 0; i < 5; i += 1) {
      const response = await request(app.getHttpServer())
        .post("/api/auth/login")
        .send({ email, password: "wrong_password_123" });

      expect([401, 429]).toContain(response.status);
    }

    await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email, password: "valid_password_123" })
      .expect(429);
  });

  it("rejects invalid access token on verify", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/token/verify")
      .send({ token: "invalid.token.value" })
      .expect(401);
  });

  it("rejects invalid refresh token for refresh/logout flows", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/token/refresh")
      .send({ refreshToken: "invalid.token.value" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/auth/token/logout")
      .send({ refreshToken: "invalid.token.value" })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/auth/token/logout-all")
      .send({ refreshToken: "invalid.token.value" })
      .expect(401);
  });
});
