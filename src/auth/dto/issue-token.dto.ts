import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";

export class IssueTokenDto {
  @IsString()
  @MinLength(2)
  @IsOptional()
  userId?: string;

  @IsEmail()
  email!: string;
}
