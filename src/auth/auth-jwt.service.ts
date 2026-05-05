import { randomUUID } from "crypto";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt, { type JwtPayload as JwtPayloadBase, type SignOptions } from "jsonwebtoken";

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
    const secret = this.configService.get<string>(secretKey) ?? fallbackSecret;

    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === "string") {
        throw new UnauthorizedException("Invalid token payload");
      }

      const payload = decoded as JwtPayloadBase;

      if (!payload.sub || !payload.email || typeof payload.exp !== "number") {
        throw new UnauthorizedException("Invalid token payload");
      }

      return {
        sub: String(payload.sub),
        email: String(payload.email),
        exp: payload.exp
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
