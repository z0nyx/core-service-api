import { UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt from "jsonwebtoken";
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
      if (key === "JWT_REFRESH_SECRET") {
        return "unit_test_refresh_secret";
      }
      if (key === "JWT_REFRESH_EXPIRES_IN") {
        return "7d";
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

  it("throws on missing token", () => {
    expect(() => service.verifyToken("")).toThrow(UnauthorizedException);
  });

  it("throws on expired token", () => {
    const expiredToken = jwt.sign(
      {
        sub: "user_1",
        email: "user@example.com"
      },
      "unit_test_secret",
      {
        algorithm: "HS256",
        expiresIn: -1
      }
    );

    expect(() => service.verifyToken(expiredToken)).toThrow(UnauthorizedException);
  });

  it("issues and verifies refresh token", () => {
    const refreshToken = service.issueRefreshToken({
      sub: "user_1",
      email: "user@example.com"
    });

    const payload = service.verifyRefreshToken(refreshToken);

    expect(payload.sub).toBe("user_1");
    expect(payload.email).toBe("user@example.com");
    expect(typeof payload.exp).toBe("number");
  });
});
