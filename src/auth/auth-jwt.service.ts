import { randomUUID } from "crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt, { JsonWebTokenError, TokenExpiredError, type JwtPayload as JwtPayloadBase, type SignOptions } from "jsonwebtoken";

type JwtPayload = {
  sub: string;
  email: string;
};

type VerifiedJwtPayload = JwtPayload & {
  exp: number;
};

@Injectable()
export class AuthJwtService {
  constructor(private readonly configService: ConfigService) {}

  issueToken(payload: JwtPayload): string {
    const secret = this.configService.get<string>("JWT_ACCESS_SECRET") ?? "dev_jwt_secret_change_me";
    const expiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";

    return jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn,
      jwtid: randomUUID()
    } as SignOptions);
  }

  verifyToken(token: string): JwtPayload {
    const payload = this.verifyWithSecret(token, "JWT_ACCESS_SECRET", "dev_jwt_secret_change_me");

    return {
      sub: payload.sub,
      email: payload.email
    };
  }

  issueRefreshToken(payload: JwtPayload): string {
    const secret = this.configService.get<string>("JWT_REFRESH_SECRET") ?? "dev_jwt_refresh_secret_change_me";
    const expiresIn = this.configService.get<string>("JWT_REFRESH_EXPIRES_IN") ?? "7d";

    return jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn,
      jwtid: randomUUID()
    } as SignOptions);
  }

  verifyRefreshToken(token: string): VerifiedJwtPayload {
    return this.verifyWithSecret(token, "JWT_REFRESH_SECRET", "dev_jwt_refresh_secret_change_me");
  }

  private verifyWithSecret(token: string, secretKey: string, fallbackSecret: string): VerifiedJwtPayload {
    if (!token || typeof token !== "string" || token.trim().length === 0) {
      throw new UnauthorizedException("Token is missing");
    }

    const secret = this.configService.get<string>(secretKey) ?? fallbackSecret;

    try {
      const decoded = jwt.verify(token.trim(), secret);
      if (typeof decoded === "string") {
        throw new UnauthorizedException("Invalid token payload");
      }

      const payload = decoded as JwtPayloadBase;
      const sub = typeof payload.sub === "string" ? payload.sub.trim() : "";
      const email = typeof payload.email === "string" ? payload.email.trim() : "";

      if (!sub || !email || typeof payload.exp !== "number") {
        throw new UnauthorizedException("Invalid token payload");
      }

      return {
        sub,
        email,
        exp: payload.exp
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof TokenExpiredError) {
        throw new UnauthorizedException("Token expired");
      }
      if (error instanceof JsonWebTokenError) {
        throw new UnauthorizedException("Invalid token");
      }
      throw new UnauthorizedException("Invalid token");
    }
  }
}
