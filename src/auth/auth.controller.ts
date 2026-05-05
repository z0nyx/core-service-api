import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthJwtService } from "./auth-jwt.service";
import { AuthRefreshTokenService } from "./auth-refresh-token.service";
import { IssueTokenDto } from "./dto/issue-token.dto";
import { LoginDto } from "./dto/login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyTokenDto } from "./dto/verify-token.dto";
import { PasswordHashingService } from "./password-hashing.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly passwordHashingService: PasswordHashingService,
    private readonly authJwtService: AuthJwtService,
    private readonly authRefreshTokenService: AuthRefreshTokenService
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

    return {
      action: "register",
      email: body.email,
      name: body.name,
      passwordHash
    };
  }

  @Post("login")
  async login(@Body() body: LoginDto) {
    const passwordHash = await this.passwordHashingService.hash(body.password);
    const isPasswordValid = await this.passwordHashingService.verify(passwordHash, body.password);

    return {
      action: "login",
      email: body.email,
      isPasswordValid
    };
  }

  @Post("token/issue")
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
}
