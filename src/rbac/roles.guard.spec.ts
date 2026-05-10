import { ExecutionContext, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthJwtService } from "../auth/auth-jwt.service";
import { PrismaService } from "../prisma.service";
import { RolesGuard } from "./roles.guard";

describe("RolesGuard", () => {
  const reflector = {
    getAllAndOverride: jest.fn()
  } as unknown as Reflector;

  const authJwtService = {
    verifyToken: jest.fn()
  } as unknown as AuthJwtService;

  const prismaService = {
    user: {
      findFirst: jest.fn()
    },
    userRole: {
      findMany: jest.fn()
    }
  } as unknown as PrismaService;

  const guard = new RolesGuard(reflector, authJwtService, prismaService);

  const createContext = (authorization?: string): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {
            authorization
          }
        })
      })
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("allows request when roles are not required", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(undefined);

    await expect(guard.canActivate(createContext())).resolves.toBe(true);
    expect(authJwtService.verifyToken).not.toHaveBeenCalled();
  });

  it("throws unauthorized when authorization header is missing", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["admin"]);

    await expect(guard.canActivate(createContext())).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("allows request when user has required role", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["admin"]);
    (authJwtService.verifyToken as jest.Mock).mockReturnValue({
      sub: "user-1",
      email: "admin@example.com"
    });
    (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-1",
      email: "admin@example.com"
    });
    (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
      {
        role: {
          code: "admin"
        }
      }
    ]);

    await expect(guard.canActivate(createContext("Bearer token.value"))).resolves.toBe(true);
  });

  it("throws forbidden when user does not have required role", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["admin"]);
    (authJwtService.verifyToken as jest.Mock).mockReturnValue({
      sub: "user-2",
      email: "user@example.com"
    });
    (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
      id: "user-2",
      email: "user@example.com"
    });
    (prismaService.userRole.findMany as jest.Mock).mockResolvedValue([
      {
        role: {
          code: "user"
        }
      }
    ]);

    await expect(guard.canActivate(createContext("Bearer token.value"))).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("throws unauthorized when token identity does not match active user", async () => {
    (reflector.getAllAndOverride as jest.Mock).mockReturnValue(["admin"]);
    (authJwtService.verifyToken as jest.Mock).mockReturnValue({
      sub: "intruder-id",
      email: "user@example.com"
    });
    (prismaService.user.findFirst as jest.Mock).mockResolvedValue({
      id: "another-id",
      email: "user@example.com"
    });

    await expect(guard.canActivate(createContext("Bearer token.value"))).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
