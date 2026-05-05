import { NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { UsersService } from "./users.service";

describe("UsersService", () => {
  const prismaService = {
    user: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn()
    }
  } as unknown as PrismaService;

  const service = new UsersService(prismaService);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("creates user", async () => {
    const payload = { email: "new@example.com", name: "New User" };
    const expected = { id: "u1", ...payload };
    (prismaService.user.create as jest.Mock).mockResolvedValue(expected);

    const result = await service.create(payload);

    expect(prismaService.user.create).toHaveBeenCalledWith({ data: payload });
    expect(result).toEqual(expected);
  });

  it("returns paginated users with filters and sorting", async () => {
    const query = {
      page: 2,
      limit: 10,
      search: "john",
      isActive: false,
      sortBy: "email",
      sortOrder: "asc"
    };

    const users = [{ id: "u1", email: "john@example.com" }];
    (prismaService.user.findMany as jest.Mock).mockResolvedValue(users);
    (prismaService.user.count as jest.Mock).mockResolvedValue(25);

    const result = await service.findAll(query);

    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: {
        isActive: false,
        OR: [
          { email: { contains: "john", mode: "insensitive" } },
          { username: { contains: "john", mode: "insensitive" } },
          { name: { contains: "john", mode: "insensitive" } },
          { firstName: { contains: "john", mode: "insensitive" } },
          { lastName: { contains: "john", mode: "insensitive" } }
        ]
      },
      orderBy: { email: "asc" },
      skip: 10,
      take: 10
    });

    expect(result).toEqual({
      items: users,
      meta: {
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3
      }
    });
  });

  it("uses defaults in findAll", async () => {
    (prismaService.user.findMany as jest.Mock).mockResolvedValue([]);
    (prismaService.user.count as jest.Mock).mockResolvedValue(0);

    const result = await service.findAll({});

    expect(prismaService.user.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      skip: 0,
      take: 20
    });

    expect(result.meta).toEqual({
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 1
    });
  });

  it("finds one user", async () => {
    const user = { id: "u1", email: "user@example.com" };
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(user);

    const result = await service.findOne("u1");

    expect(prismaService.user.findUnique).toHaveBeenCalledWith({ where: { id: "u1" } });
    expect(result).toEqual(user);
  });

  it("throws NotFoundException when user not found", async () => {
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.findOne("missing")).rejects.toThrow(NotFoundException);
  });

  it("updates existing user", async () => {
    const existing = { id: "u1", email: "user@example.com", isActive: true };
    const updated = { ...existing, name: "Updated" };

    (prismaService.user.findUnique as jest.Mock).mockResolvedValue(existing);
    (prismaService.user.update as jest.Mock).mockResolvedValue(updated);

    const result = await service.update("u1", { name: "Updated" });

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { name: "Updated" }
    });
    expect(result).toEqual(updated);
  });

  it("soft deletes active user", async () => {
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: "u1", isActive: true });
    (prismaService.user.update as jest.Mock).mockResolvedValue({ id: "u1", isActive: false });

    const result = await service.remove("u1");

    expect(prismaService.user.update).toHaveBeenCalledWith({
      where: { id: "u1" },
      data: { isActive: false }
    });
    expect(result).toEqual({ success: true });
  });

  it("does not update already inactive user", async () => {
    (prismaService.user.findUnique as jest.Mock).mockResolvedValue({ id: "u1", isActive: false });

    const result = await service.remove("u1");

    expect(prismaService.user.update).not.toHaveBeenCalled();
    expect(result).toEqual({ success: true });
  });
});
