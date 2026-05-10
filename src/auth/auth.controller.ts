import { Body, Controller, Get, Inject, Post, UnauthorizedException, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import type Redis from "ioredis";
import { Roles } from "../rbac/roles.decorator";
import { RolesGuard } from "../rbac/roles.guard";
import { REDIS_CLIENT } from "../redis.provider";
import { AuthJwtService } from "./auth-jwt.service";
import { AuthRefreshTokenService } from "./auth-refresh-token.service";
import { AuthSecurityService } from "./auth-security.service";
import { IssueTokenDto } from "./dto/issue-token.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyTokenDto } from "./dto/verify-token.dto";
import { PasswordHashingService } from "./password-hashing.service";

@Controller("auth")
export class AuthController {
  constructor(
    @Inject(REDIS_CLIENT) private readonly redisClient: Redis,
    private readonly passwordHashingService: PasswordHashingService,
    private readonly authJwtService: AuthJwtService,
    private readonly authRefreshTokenService: AuthRefreshTokenService,
    private readonly authSecurityService: AuthSecurityService
  ) {}

  @Get("health")
  health() {
    return {
      module: "auth",
      status: "ok"
    };
  }

  @Post("register")
  async register(@Body() body: RegisterDto) {
    const passwordHash = await this.passwordHashingService.hash(body.password);
    await this.redisClient.set(`auth:user:password:${body.email.toLowerCase()}`, passwordHash);

    return {
      action: "register",
      email: body.email,
      name: body.name
    };
  }

  @Post("login")
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000
    }
  })
  async login(@Body() body: LoginDto) {
    const loginKey = body.email.toLowerCase();
    await this.authSecurityService.ensureLoginNotLocked(loginKey);

    const storedPasswordHash = await this.redisClient.get(`auth:user:password:${loginKey}`);
    if (!storedPasswordHash) {
      await this.authSecurityService.recordLoginFailure(loginKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    const isPasswordValid = await this.passwordHashingService.verify(storedPasswordHash, body.password);
    if (!isPasswordValid) {
      await this.authSecurityService.recordLoginFailure(loginKey);
      throw new UnauthorizedException("Invalid credentials");
    }

    await this.authSecurityService.clearLoginFailures(loginKey);

    return this.authRefreshTokenService.issueTokenPair({
      sub: body.email,
      email: body.email
    });
  }

  @Post("token/issue")
  @UseGuards(RolesGuard)
  @Roles("admin")
  issueToken(@Body() body: IssueTokenDto) {
    return this.authRefreshTokenService.issueTokenPair({
      sub: body.userId ?? body.email,
      email: body.email
    });
  }

  @Post("token/verify")
  verifyToken(@Body() body: VerifyTokenDto) {
    const payload = this.authJwtService.verifyToken(body.token);

    return {
      payload
    };
  }

  @Post("token/refresh")
  refreshToken(@Body() body: RefreshTokenDto) {
    return this.authRefreshTokenService.rotate(body.refreshToken);
  }

  @Post("token/logout")
  logout(@Body() body: RefreshTokenDto) {
    return this.authRefreshTokenService.logoutSingleSession(body.refreshToken);
  }

  @Post("token/logout-all")
  logoutAll(@Body() body: RefreshTokenDto) {
    return this.authRefreshTokenService.logoutAllSessions(body.refreshToken);
  }
}
