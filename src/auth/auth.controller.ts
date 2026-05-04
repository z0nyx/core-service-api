import { Body, Controller, Get, Post } from "@nestjs/common";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";

@Controller("auth")
export class AuthController {
  @Get("health")
  health() {
    return {
      module: "auth",
      status: "ok"
    };
  }

  @Post("register")
  register(@Body() body: RegisterDto) {
    return {
      action: "register",
      email: body.email,
      name: body.name
    };
  }

  @Post("login")
  login(@Body() body: LoginDto) {
    return {
      action: "login",
      email: body.email
    };
  }
}
