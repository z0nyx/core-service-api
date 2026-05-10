import "reflect-metadata";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma.service";
import { REDIS_CLIENT } from "../redis.provider";

type UserRecord = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

class InMemoryRedis {
  private store = new Map<string, string>();

  async get(key: string) {
    return this.store.get(key) ?? null;
  }

  async set(key: string, value: string) {
    this.store.set(key, value);
    return "OK";
  }

  async incr(_key: string) {
    return 1;
  }

  async expire(_key: string, _seconds: number) {
    return 1;
  }

  async ttl(_key: string) {
    return -1;
  }

  async del(key: string) {
    const existed = this.store.delete(key);
    return existed ? 1 : 0;
  }
}

class InMemoryPrisma {
  private users: UserRecord[] = [];
  private userCounter = 1;
  private tokenCounter = 1;

  user = {
    create: async ({
      data
    }: {
      data: Partial<UserRecord> & {
        email: string;
      };
    }) => {
      const now = new Date();
      const record: UserRecord = {
        id: `u${this.userCounter++}`,
        email: data.email,
        username: data.username ?? null,
        name: data.name ?? null,
        firstName: data.firstName ?? null,
        lastName: data.lastName ?? null,
        avatarUrl: data.avatarUrl ?? null,
        bio: data.bio ?? null,
        phone: data.phone ?? null,
        isActive: data.isActive ?? true,
        lastLoginAt: data.lastLoginAt ?? null,
        createdAt: now,
        updatedAt: now
      };
      this.users.push(record);
      return record;
    },

    findMany: async () => {
      return this.users.filter((user) => user.isActive);
    },

    count: async () => {
      return this.users.filter((user) => user.isActive).length;
    },

    findUnique: async ({ where }: { where: { id: string } }) => {
      return this.users.find((user) => user.id === where.id) ?? null;
    },

    update: async ({ where, data }: { where: { id: string }; data: Partial<UserRecord> }) => {
      const user = this.users.find((item) => item.id === where.id);
      if (!user) {
        throw new Error("User not found");
      }
      Object.assign(user, data, { updatedAt: new Date() });
      return user;
    }
  };

  userRole = {
    findMany: async ({ where }: { where: { userId: string } }) => {
      if (where.userId === "admin@example.com") {
        return [{ role: { code: "admin" } }];
      }
      return [{ role: { code: "user" } }];
    }
  };

  refreshToken = {
    create: async ({
      data
    }: {
      data: { userId: string; tokenHash: string; expiresAt: Date };
    }) => {
      return {
        id: String(this.tokenCounter++),
        userId: data.userId,
        tokenHash: data.tokenHash,
        expiresAt: data.expiresAt,
        revokedAt: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    },
    findMany: async () => {
      return [];
    },
    update: async () => {
      return {
        id: "0"
      };
    },
    updateMany: async () => {
      return { count: 0 };
    }
  };
}

describe("RBAC role restrictions (e2e)", () => {
  let app: INestApplication;
  let adminAccessToken: string;
  let userAccessToken: string;
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

    await request(app.getHttpServer())
      .post("/api/auth/register")
      .send({ email: "user@example.com", password: "user_password_123", name: "User" })
      .expect(201);

    const adminLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "admin@example.com", password: "admin_password_123" })
      .expect(201);
    adminAccessToken = adminLogin.body.accessToken;

    const userLogin = await request(app.getHttpServer())
      .post("/api/auth/login")
      .send({ email: "user@example.com", password: "user_password_123" })
      .expect(201);
    userAccessToken = userLogin.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it("rejects users route without token", async () => {
    await request(app.getHttpServer()).get("/api/users").expect(401);
  });

  it("rejects users route for non-admin role", async () => {
    await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${userAccessToken}`)
      .expect(403);
  });

  it("allows users route for admin role", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/users")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .expect(200);

    expect(response.body).toHaveProperty("items");
    expect(response.body).toHaveProperty("meta");
  });

  it("rejects token issue route for non-admin role", async () => {
    await request(app.getHttpServer())
      .post("/api/auth/token/issue")
      .set("Authorization", `Bearer ${userAccessToken}`)
      .send({ email: "test@example.com", userId: "test-user" })
      .expect(403);
  });

  it("allows token issue route for admin role", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/auth/token/issue")
      .set("Authorization", `Bearer ${adminAccessToken}`)
      .send({ email: "test@example.com", userId: "test-user" })
      .expect(201);

    expect(response.body.accessToken).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });
});
