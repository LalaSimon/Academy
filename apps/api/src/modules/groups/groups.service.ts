import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClassCalendarService } from '../google/class-calendar.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupQueryDto } from './dto/group-query.dto';
import { GroupScheduleDto } from './dto/group-schedule.dto';

const GROUP_SELECT = {
  id: true,
  name: true,
  description: true,
  language: true,
  level: true,
  maxStudents: true,
  isActive: true,
  createdAt: true,
  teacher: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
  _count: { select: { students: { where: { isActive: true } } } },
  schedules: {
    orderBy: { effectiveFrom: 'asc' as const },
    select: {
      id: true,
      dayOfWeek: true,
      startTime: true,
      durationMin: true,
      pricePerClass: true,
      effectiveFrom: true,
    },
  },
} as const;

@Injectable()
export class GroupsService {
  constructor(
    private prisma: PrismaService,
    private calendar: ClassCalendarService,
  ) {}

  async findAll(query: GroupQueryDto) {
    const {
      search,
      language,
      teacherId,
      isActive,
      page = 1,
      limit = 20,
    } = query;
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
      this.prisma.group.findMany({
        where,
        select: GROUP_SELECT,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
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
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: { student: { lastName: 'asc' } },
        },
      },
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
    return group;
  }

  async create(dto: CreateGroupDto) {
    const { schedules, ...groupData } = dto;

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.group.create({
        data: groupData,
        select: GROUP_SELECT,
      });

      if (schedules?.length) {
        await tx.groupSchedule.createMany({
          data: schedules.map((s) => ({
            groupId: group.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            durationMin: s.durationMin,
            pricePerClass: s.pricePerClass,
            effectiveFrom: s.effectiveFrom
              ? new Date(s.effectiveFrom)
              : new Date(),
          })),
        });

        return tx.group.findUnique({
          where: { id: group.id },
          select: GROUP_SELECT,
        });
      }

      return group;
    });
  }

  async update(id: string, dto: UpdateGroupDto) {
    await this.assertExists(id);
    const { ...data } = dto;
    return this.prisma.group.update({
      where: { id },
      data: data as Parameters<typeof this.prisma.group.update>[0]['data'],
      select: GROUP_SELECT,
    });
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

  // ── Harmonogram ──────────────────────────────────────────────────────────────

  async addSchedule(groupId: string, dto: GroupScheduleDto) {
    await this.assertExists(groupId);
    return this.prisma.groupSchedule.create({
      data: {
        groupId,
        dayOfWeek: dto.dayOfWeek,
        startTime: dto.startTime,
        durationMin: dto.durationMin,
        pricePerClass: dto.pricePerClass,
        effectiveFrom: dto.effectiveFrom
          ? new Date(dto.effectiveFrom)
          : new Date(),
      },
    });
  }

  async removeSchedule(groupId: string, scheduleId: string) {
    await this.assertExists(groupId);
    const schedule = await this.prisma.groupSchedule.findFirst({
      where: { id: scheduleId, groupId },
    });
    if (!schedule)
      throw new NotFoundException(`Schedule ${scheduleId} not found`);
    await this.prisma.groupSchedule.delete({ where: { id: scheduleId } });
  }

  // ── Generowanie zajęć ────────────────────────────────────────────────────────

  async generateClasses(groupId: string, year: number, month: number) {
    if (month < 1 || month > 12)
      throw new BadRequestException('month must be 1–12');

    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
      include: {
        schedules: { orderBy: { effectiveFrom: 'asc' } },
        students: { where: { isActive: true }, select: { studentId: true } },
      },
    });
    if (!group) throw new NotFoundException(`Group ${groupId} not found`);
    if (!group.schedules.length)
      throw new BadRequestException('Group has no schedule defined');

    const daysInMonth = new Date(year, month, 0).getDate();
    const created: { id: string; scheduledAt: Date }[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      // JS: 0=Sun…6=Sat → convert to 0=Mon…6=Sun
      const dow = (date.getDay() + 6) % 7;

      // Find all slots for this weekday — pick latest effectiveFrom <= date per slot
      const slotsForDay = group.schedules.filter(
        (s) => s.dayOfWeek === dow && new Date(s.effectiveFrom) <= date,
      );

      // Group by (dayOfWeek+startTime) — pick the newest version for each unique slot
      const slotMap = new Map<string, (typeof slotsForDay)[0]>();
      for (const s of slotsForDay) {
        const key = `${s.dayOfWeek}-${s.startTime}`;
        const existing = slotMap.get(key);
        if (
          !existing ||
          new Date(s.effectiveFrom) > new Date(existing.effectiveFrom)
        ) {
          slotMap.set(key, s);
        }
      }

      for (const schedule of slotMap.values()) {
        const [h, m] = schedule.startTime.split(':').map(Number);
        const scheduledAt = new Date(year, month - 1, day, h, m);

        const exists = await this.prisma.class.findFirst({
          where: { groupId, scheduledAt },
        });
        if (exists) continue;

        const cls = await this.prisma.class.create({
          data: {
            title: group.name,
            groupId,
            scheduledAt,
            durationMin: schedule.durationMin,
            pricePerClass: schedule.pricePerClass,
            scheduleId: schedule.id,
            teacherId: group.teacherId,
          },
        });
        created.push({ id: cls.id, scheduledAt: cls.scheduledAt });
      }
    }

    // Mid-month supplement payment logic
    if (created.length > 0 && group.students.length > 0) {
      await this.createSupplementPaymentsIfNeeded(group, created, year, month);
    }

    // Główna ścieżka tworzenia zajęć w aplikacji — bez tego zajęcia generowane
    // z harmonogramu (czyli większość) nie dostawały linku Meet.
    await this.calendar.attach(created.map((c) => c.id));

    return { created: created.length, classes: created };
  }

  private async createSupplementPaymentsIfNeeded(
    group: {
      id: string;
      name: string;
      students: { studentId: string }[];
    },
    newClasses: { id: string; scheduledAt: Date }[],
    year: number,
    month: number,
  ) {
    const today = new Date();
    const currentMonth = today.getMonth() + 1;
    const currentYear = today.getFullYear();

    // Only create supplements if we're generating for the current month past the 1st
    if (year !== currentYear || month !== currentMonth || today.getDate() <= 1)
      return;

    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    for (const { studentId } of group.students) {
      // Check if monthly payment for this student+group already exists
      const existing = await this.prisma.payment.findFirst({
        where: { studentId, groupId: group.id, periodStart: startOfMonth },
      });
      if (!existing) continue; // No monthly payment yet — new classes will be included in cron

      // Calculate supplement amount from new classes
      const newClassDetails = await this.prisma.class.findMany({
        where: { id: { in: newClasses.map((c) => c.id) } },
        select: { pricePerClass: true, title: true },
      });

      const supplementAmount = newClassDetails.reduce(
        (sum, c) => sum + Number(c.pricePerClass ?? 0),
        0,
      );
      if (supplementAmount === 0) continue;

      // Determine due date based on today
      let dueDate: Date;
      if (today.getDate() >= 28) {
        // Between 28th and end of month → add to next month payment (14th)
        dueDate = new Date(year, month, 14); // 14th of next month
      } else {
        // 14th has passed → supplement due on 28th
        dueDate = new Date(year, month - 1, 28);
      }

      const monthName = startOfMonth.toLocaleString('pl', {
        month: 'long',
        year: 'numeric',
      });

      await this.prisma.payment.create({
        data: {
          studentId,
          groupId: group.id,
          amount: supplementAmount.toFixed(2),
          currency: 'PLN',
          description: `${group.name} — dopłata ${monthName} (+${newClassDetails.length} lekcji)`,
          dueDate,
          periodStart: startOfMonth,
          periodEnd: endOfMonth,
        },
      });
    }
  }

  private async assertExists(id: string) {
    const group = await this.prisma.group.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!group) throw new NotFoundException(`Group ${id} not found`);
  }
}
