import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClassStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';

export interface UpdateBatchDto {
  title?: string;
  description?: string;
  teacherId?: string;
  durationMin?: number;
  meetLink?: string;
}

const CLASS_SELECT = {
  id: true,
  title: true,
  description: true,
  scheduledAt: true,
  durationMin: true,
  meetLink: true,
  status: true,
  cancelReason: true,
  batchId: true,
  createdAt: true,
  group: {
    select: {
      id: true,
      name: true,
      language: true,
      level: true,
      teacher: { select: { id: true, firstName: true, lastName: true } },
    },
  },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { attendances: true } },
} as const;

@Injectable()
export class ClassesService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: ClassQueryDto) {
    const { groupId, status, from, to, page = 1, limit = 50 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(groupId && { groupId }),
      ...(status && { status }),
      ...((from || to) && {
        scheduledAt: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        select: CLASS_SELECT,
        skip,
        take: limit,
        orderBy: { scheduledAt: 'asc' },
      }),
      this.prisma.class.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      select: {
        ...CLASS_SELECT,
        attendances: {
          select: {
            id: true,
            status: true,
            student: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
    return cls;
  }

  async create(dto: CreateClassDto) {
    let { teacherId } = dto;
    if (!teacherId) {
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
        select: { teacherId: true },
      });
      teacherId = group?.teacherId;
    }
    return this.prisma.class.create({
      data: { ...dto, teacherId },
      select: CLASS_SELECT,
    });
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.assertExists(id);
    return this.prisma.class.update({
      where: { id },
      data: dto,
      select: CLASS_SELECT,
    });
  }

  async remove(id: string) {
    await this.assertExists(id);
    await this.prisma.attendance.deleteMany({ where: { classId: id } });
    await this.prisma.class.delete({ where: { id } });
  }

  async createBulk(items: CreateClassDto[]) {
    const batchId = randomUUID();
    const prepared = await Promise.all(
      items.map(async (item) => {
        let { teacherId } = item;
        if (!teacherId) {
          const group = await this.prisma.group.findUnique({
            where: { id: item.groupId },
            select: { teacherId: true },
          });
          teacherId = group?.teacherId;
        }
        return { ...item, teacherId, batchId };
      }),
    );
    return this.prisma.$transaction(
      prepared.map((data) =>
        this.prisma.class.create({ data, select: CLASS_SELECT }),
      ),
    );
  }

  async updateBatch(batchId: string, dto: UpdateBatchDto) {
    const count = await this.prisma.class.count({ where: { batchId } });
    if (count === 0) throw new NotFoundException(`Batch ${batchId} not found`);
    await this.prisma.class.updateMany({ where: { batchId }, data: dto });
    return this.prisma.class.findMany({
      where: { batchId },
      select: CLASS_SELECT,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async removeBatch(batchId: string) {
    await this.prisma.attendance.deleteMany({ where: { class: { batchId } } });
    await this.prisma.class.deleteMany({ where: { batchId } });
  }

  async updateStatus(id: string, status: ClassStatus, cancelReason?: string) {
    await this.assertExists(id);
    return this.prisma.class.update({
      where: { id },
      data: { status, ...(cancelReason && { cancelReason }) },
      select: CLASS_SELECT,
    });
  }

  private async assertExists(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
  }
}
