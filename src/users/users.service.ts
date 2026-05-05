import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma.service";
import { CreateUserDto } from "./dto/create-user.dto";
import { FindUsersQueryDto } from "./dto/find-users-query.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  create(data: CreateUserDto) {
    return this.prismaService.user.create({
      data
    });
  }

  async findAll(query: FindUsersQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const search = query.search?.trim();
    const where: Prisma.UserWhereInput = {
      isActive: typeof query.isActive === "boolean" ? query.isActive : true,
      ...(search
        ? {
            OR: [
              { email: { contains: search, mode: "insensitive" } },
              { username: { contains: search, mode: "insensitive" } },
              { name: { contains: search, mode: "insensitive" } },
              { firstName: { contains: search, mode: "insensitive" } },
              { lastName: { contains: search, mode: "insensitive" } }
            ]
          }
        : {})
    };

    const orderBy: Prisma.UserOrderByWithRelationInput = {
      [query.sortBy ?? "createdAt"]: query.sortOrder ?? "desc"
    };

    const [items, total] = await Promise.all([
      this.prismaService.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit
      }),
      this.prismaService.user.count({ where })
    ]);

    return {
      items,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit))
      }
    };
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
    const user = await this.findOne(id);
    if (!user.isActive) {
      return {
        success: true
      };
    }

    await this.prismaService.user.update({
      where: { id },
      data: {
        isActive: false
      }
    });

    return {
      success: true
    };
  }
}
