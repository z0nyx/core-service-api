import { ConfigService } from "@nestjs/config";
import { UnauthorizedException } from "@nestjs/common";
import { AuthJwtService } from "./auth-jwt.service";

describe("AuthJwtService", () => {
  const configService = {
    get: jest.fn((key: string) => {
      if (key === "JWT_ACCESS_SECRET") {
        return "unit_test_secret";
      }
      if (key === "JWT_ACCESS_EXPIRES_IN") {
        return "15m";
      }
      return undefined;
    })
  } as unknown as ConfigService;

  const service = new AuthJwtService(configService);

  it("issues and verifies token", () => {
    const token = service.issueToken({
      sub: "user_1",
      email: "user@example.com"
    });

    const payload = service.verifyToken(token);

    expect(typeof token).toBe("string");
    expect(payload).toEqual({
      sub: "user_1",
      email: "user@example.com"
    });
  });

  it("throws on invalid token", () => {
    expect(() => service.verifyToken("invalid.token.value")).toThrow(UnauthorizedException);
  });
});
