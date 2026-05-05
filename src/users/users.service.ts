import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: CreateUserDto) {
    return this.prismaService.user.create({
      data
    });
  }

  findAll() {
    return this.prismaService.user.findMany({
      orderBy: {
        createdAt: "desc"
      }
    });
  }

  async findOne(id: string) {
    const user = await this.prismaService.user.findUnique({
      where: { id }
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async update(id: string, data: UpdateUserDto) {
    await this.findOne(id);

    return this.prismaService.user.update({
      where: { id },
      data
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prismaService.user.delete({
      where: { id }
    });
  }
}
