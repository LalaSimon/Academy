import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupQueryDto } from './dto/group-query.dto';

const GROUP_SELECT = {
  id: true,
  name: true,
  description: true,
  language: true,
  level: true,
  maxStudents: true,
  isActive: true,
  createdAt: true,
  teacher: { select: { id: true, firstName: true, lastName: true, email: true } },
  _count: { select: { students: { where: { isActive: true } } } },
} as const;

@Injectable()
export class GroupsService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: GroupQueryDto) {
    const { search, language, teacherId, isActive, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(typeof isActive === 'boolean' && { isActive }),
      ...(language && { language }),
      ...(teacherId && { teacherId }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
          { language: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.group.findMany({ where, select: GROUP_SELECT, skip, take: limit, orderBy: { name: 'asc' } }),
      this.prisma.group.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: {
        ...GROUP_SELECT,
        students: {
          where: { isActive: true },
          select: {
            id: true,
            joinedAt: true,
            student: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(dto: CreateGroupDto) {
    return this.prisma.group.create({ data: dto, select: GROUP_SELECT });
  }

  async update(id: string, dto: UpdateGroupDto) {
    await this.assertExists(id);
    return this.prisma.group.update({ where: { id }, data: dto, select: GROUP_SELECT });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.groupStudent.deleteMany({ where: { groupId: id } });
    await this.prisma.group.delete({ where: { id } });
  }

  async addStudent(groupId: string, studentId: string) {
    await this.assertExists(groupId);
    return this.prisma.groupStudent.upsert({
      where: { groupId_studentId: { groupId, studentId } },
      create: { groupId, studentId, isActive: true },
      update: { isActive: true },
    });
  }

  async removeStudent(groupId: string, studentId: string) {
    await this.assertExists(groupId);
    await this.prisma.groupStudent.update({
      where: { groupId_studentId: { groupId, studentId } },
      data: { isActive: false },
    });
  }

  private async assertExists(id: string) {
    const group = await this.prisma.group.findUnique({ where: { id }, select: { id: true } });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
  }
}
