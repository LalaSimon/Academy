import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: UserQueryDto) {
    const { role, search, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { firstName: { contains: search, mode: 'insensitive' as const } },
          { lastName: { contains: search, mode: 'insensitive' as const } },
          { email: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({ where, select: USER_SELECT, skip, take: limit, orderBy: { lastName: 'asc' } }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        ...USER_SELECT,
        studentGroups: { select: { group: { select: { id: true, name: true, language: true } } } },
        asParent: { select: { student: { select: { id: true, firstName: true, lastName: true } } } },
        asStudent: { select: { parent: { select: { id: true, firstName: true, lastName: true } } } },
      },
    });
    if (!user) throw new NotFoundException(`User ${id} not found`);
    return user;
  }

  async create(dto: CreateUserDto) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');

    const passwordHash = await argon2.hash(dto.password);
    const { password: _, ...rest } = dto;
    return this.prisma.user.create({ data: { ...rest, passwordHash }, select: USER_SELECT });
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);
    return this.prisma.user.update({ where: { id }, data: dto, select: USER_SELECT });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.delete({ where: { id } });
  }

  async linkParentStudent(parentId: string, studentId: string) {
    await Promise.all([this.findOne(parentId), this.findOne(studentId)]);
    return this.prisma.parentStudent.upsert({
      where: { parentId_studentId: { parentId, studentId } },
      create: { parentId, studentId },
      update: {},
    });
  }

  async unlinkParentStudent(parentId: string, studentId: string) {
    await this.prisma.parentStudent.delete({
      where: { parentId_studentId: { parentId, studentId } },
    });
  }
}
