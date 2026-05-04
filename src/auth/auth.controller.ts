import { Body, Controller, Get, Post } from "@nestjs/common";
import { AuthJwtService } from "./auth-jwt.service";
import { IssueTokenDto } from "./dto/issue-token.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { VerifyTokenDto } from "./dto/verify-token.dto";
import { PasswordHashingService } from "./password-hashing.service";

@Controller("auth")
export class AuthController {
  constructor(
    private readonly passwordHashingService: PasswordHashingService,
    private readonly authJwtService: AuthJwtService
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
    const token = this.authJwtService.issueToken({
      sub: body.userId ?? body.email,
      email: body.email
    });

    return {
      token
    };
  }

  @Post("token/verify")
  verifyToken(@Body() body: VerifyTokenDto) {
    const payload = this.authJwtService.verifyToken(body.token);

    return {
      payload
    };
  }
}
