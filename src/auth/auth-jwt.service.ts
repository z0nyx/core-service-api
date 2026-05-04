import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import jwt, { type SignOptions } from "jsonwebtoken";

type JwtPayload = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthJwtService {
  constructor(private readonly configService: ConfigService) {}

  issueToken(payload: JwtPayload): string {
    const secret = this.configService.get<string>("JWT_ACCESS_SECRET") ?? "dev_jwt_secret_change_me";
    const expiresIn = this.configService.get<string>("JWT_ACCESS_EXPIRES_IN") ?? "15m";

    return jwt.sign(payload, secret, {
      algorithm: "HS256",
      expiresIn
    } as SignOptions);
  }

  verifyToken(token: string): JwtPayload {
    const secret = this.configService.get<string>("JWT_ACCESS_SECRET") ?? "dev_jwt_secret_change_me";

    try {
      const decoded = jwt.verify(token, secret);
      if (typeof decoded === "string") {
        throw new UnauthorizedException("Invalid token payload");
      }

      return {
        sub: String(decoded.sub),
        email: String(decoded.email)
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
