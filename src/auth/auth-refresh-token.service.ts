import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { AuthJwtService } from "./auth-jwt.service";
import { PasswordHashingService } from "./password-hashing.service";

type TokenIdentity = {
  sub: string;
  email: string;
};

@Injectable()
export class AuthRefreshTokenService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly authJwtService: AuthJwtService,
    private readonly passwordHashingService: PasswordHashingService
  ) {}

  async issueTokenPair(identity: TokenIdentity) {
    const accessToken = this.authJwtService.issueToken(identity);
    const refreshToken = this.authJwtService.issueRefreshToken(identity);
    const tokenHash = await this.passwordHashingService.hash(refreshToken);
    const refreshPayload = this.authJwtService.verifyRefreshToken(refreshToken);

    await this.prismaService.refreshToken.create({
      data: {
        userId: identity.sub,
        tokenHash,
        expiresAt: new Date(refreshPayload.exp * 1000)
      }
    });

    return {
      accessToken,
      refreshToken
    };
  }

  async rotate(refreshToken: string) {
    const refreshPayload = this.authJwtService.verifyRefreshToken(refreshToken);

    const activeTokens = await this.prismaService.refreshToken.findMany({
      where: {
        userId: refreshPayload.sub,
        revokedAt: null,
        expiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    });

    let matchedTokenId: string | null = null;

    for (const tokenRecord of activeTokens) {
      const isMatch = await this.passwordHashingService.verify(tokenRecord.tokenHash, refreshToken);
      if (isMatch) {
        matchedTokenId = tokenRecord.id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new UnauthorizedException("Refresh token is invalid");
    }

    await this.prismaService.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() }
    });

    return this.issueTokenPair({
      sub: refreshPayload.sub,
      email: refreshPayload.email
    });
  }

  async logoutSingleSession(refreshToken: string) {
    const refreshPayload = this.authJwtService.verifyRefreshToken(refreshToken);

    const activeTokens = await this.prismaService.refreshToken.findMany({
      where: {
        userId: refreshPayload.sub,
        revokedAt: null
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 20
    });

    let matchedTokenId: string | null = null;

    for (const tokenRecord of activeTokens) {
      const isMatch = await this.passwordHashingService.verify(tokenRecord.tokenHash, refreshToken);
      if (isMatch) {
        matchedTokenId = tokenRecord.id;
        break;
      }
    }

    if (!matchedTokenId) {
      throw new UnauthorizedException("Refresh token is invalid");
    }

    await this.prismaService.refreshToken.update({
      where: { id: matchedTokenId },
      data: { revokedAt: new Date() }
    });

    return {
      success: true
    };
  }

  async logoutAllSessions(refreshToken: string) {
    const refreshPayload = this.authJwtService.verifyRefreshToken(refreshToken);

    const result = await this.prismaService.refreshToken.updateMany({
      where: {
        userId: refreshPayload.sub,
        revokedAt: null
      },
      data: {
        revokedAt: new Date()
      }
    });

    return {
      success: true,
      revokedCount: result.count
    };
  }
}
