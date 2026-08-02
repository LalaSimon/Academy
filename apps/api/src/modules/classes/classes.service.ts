import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { ClassStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppNotificationsService } from '../notifications/in-app-notifications.service';
import { ClassCalendarService } from '../google/class-calendar.service';
import { formatPlDateTime } from '../../common/utils/format-date';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';

export interface UpdateBatchDto {
  title?: string;
  description?: string;
  teacherId?: string;
  durationMin?: number;
  meetLink?: string;
  // When provided, all classes shift by the same day offset as the first class
  // and get the same UTC hour/minute as this template date
  scheduledAtTemplate?: string;
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
  student: { select: { id: true, firstName: true, lastName: true } },
  teacher: { select: { id: true, firstName: true, lastName: true } },
  _count: { select: { attendances: true } },
} as const;

@Injectable()
export class ClassesService {
  constructor(
    private prisma: PrismaService,
    private notifications: InAppNotificationsService,
    private calendar: ClassCalendarService,
  ) {}

  /**
   * Ograniczenie widoczności dla ucznia i rodzica. Przekazywane osobno od
   * `query`, bo pochodzi z tokenu, a nie od klienta — nie da się go podrobić.
   */
  async findAll(
    query: ClassQueryDto,
    learnerScope?: { groupIds: string[]; studentIds: string[] },
  ) {
    const {
      groupId,
      studentId,
      status,
      teacherId,
      from,
      to,
      page = 1,
      limit = 50,
    } = query;
    const skip = (page - 1) * limit;

    // Warunki zawężające trafiają do AND, żeby kolejne `OR` się nie nadpisywały.
    const and: Record<string, unknown>[] = [];

    // `Class.teacherId` bywa null — wtedy prowadzącym jest nauczyciel grupy.
    // Ten sam wzorzec co w `getTeacherStats`, inaczej nauczyciel nie zobaczy
    // zajęć odziedziczonych po grupie.
    if (teacherId) {
      and.push({
        OR: [{ teacherId }, { teacherId: null, group: { teacherId } }],
      });
    }

    if (learnerScope) {
      // Zajęcia grupowe ucznia ORAZ jego zajęcia 1:1 (te nie mają `groupId`,
      // więc sam filtr po grupach by je zgubił).
      and.push({
        OR: [
          { groupId: { in: learnerScope.groupIds } },
          { studentId: { in: learnerScope.studentIds } },
        ],
      });
    }

    const where = {
      ...(groupId && { groupId }),
      ...(studentId && { studentId }),
      ...(status && { status }),
      ...(and.length > 0 && { AND: and }),
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

    // --- group class ---
    if (dto.groupId) {
      const group = await this.prisma.group.findUnique({
        where: { id: dto.groupId },
        select: {
          teacherId: true,
          students: { where: { isActive: true }, select: { studentId: true } },
        },
      });
      if (!teacherId) teacherId = group?.teacherId;

      const cls = await this.prisma.class.create({
        data: {
          title: dto.title,
          description: dto.description,
          scheduledAt: dto.scheduledAt,
          durationMin: dto.durationMin,
          meetLink: dto.meetLink,
          pricePerClass: dto.pricePerClass,
          groupId: dto.groupId,
          teacherId,
        },
        select: CLASS_SELECT,
      });

      if (dto.pricePerClass && group?.students.length) {
        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const date = new Date(dto.scheduledAt).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        const description = `${dto.title} — ${date} (${Number(dto.pricePerClass).toFixed(0)} PLN)`;
        await this.prisma.$transaction(
          group.students.map((gs) =>
            this.prisma.payment.create({
              data: {
                studentId: gs.studentId,
                amount: dto.pricePerClass!,
                currency: 'PLN',
                description,
                dueDate,
              },
            }),
          ),
        );
      }

      // Gałąź grupowa ma własne wyjście z metody — łatwo ją przeoczyć przy
      // zmianach obejmujących „koniec create" (tak powstał brak linków dla
      // zajęć grupowych po Fazie 5.8).
      await this.calendar.attach([cls.id]);
      return this.findOne(cls.id);
    }

    // --- individual student class ---
    const cls = await this.prisma.class.create({
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt,
        durationMin: dto.durationMin,
        meetLink: dto.meetLink,
        pricePerClass: dto.pricePerClass,
        studentId: dto.studentId,
        teacherId,
      },
      select: CLASS_SELECT,
    });

    if (dto.studentId) {
      await this.prisma.attendance.create({
        data: { classId: cls.id, studentId: dto.studentId, status: 'PRESENT' },
      });

      if (dto.pricePerClass) {
        const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const date = new Date(dto.scheduledAt).toLocaleDateString('pl-PL', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        });
        await this.prisma.payment.create({
          data: {
            studentId: dto.studentId,
            amount: dto.pricePerClass,
            currency: 'PLN',
            description: `${dto.title} — ${date} (${Number(dto.pricePerClass).toFixed(0)} PLN)`,
            dueDate,
          },
        });
      }
    }

    await this.calendar.attach([cls.id]);
    return this.findOne(cls.id);
  }

  async update(id: string, dto: UpdateClassDto) {
    await this.assertExists(id);
    await this.prisma.class.update({
      where: { id },
      data: dto,
      select: CLASS_SELECT,
    });

    // Zajęcia sprzed włączenia integracji nie mają wydarzenia — edycja jest
    // naturalnym momentem, żeby je uzupełnić. `attach` sam pomija te, które
    // link już mają, więc nie nadpisze ręcznie wpisanego adresu.
    await this.calendar.attach([id]);

    // Zmiana terminu, czasu trwania lub tytułu musi trafić do kalendarza —
    // inaczej wydarzenie zostaje ze starą datą.
    if (dto.scheduledAt || dto.durationMin || dto.title || dto.description) {
      await this.calendar.sync([id]);
    }

    // `updated` pochodzi sprzed synchronizacji — odczytujemy ponownie, żeby
    // front dostał świeży link.
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.assertExists(id);
    // PRZED usunięciem — potem nie ma skąd wziąć googleEventId.
    await this.calendar.detach([id]);
    await this.prisma.attendance.deleteMany({ where: { classId: id } });
    await this.prisma.class.delete({ where: { id } });
  }

  async createBulk(items: CreateClassDto[]) {
    const batchId = randomUUID();
    const prepared = await Promise.all(
      items.map(async (item) => {
        let { teacherId } = item;
        if (!teacherId && item.groupId) {
          const group = await this.prisma.group.findUnique({
            where: { id: item.groupId },
            select: { teacherId: true },
          });
          teacherId = group?.teacherId;
        }
        return {
          title: item.title,
          description: item.description,
          scheduledAt: item.scheduledAt,
          durationMin: item.durationMin,
          meetLink: item.meetLink,
          pricePerClass: item.pricePerClass,
          groupId: item.groupId,
          studentId: item.studentId,
          teacherId,
          batchId,
        };
      }),
    );

    const created = await this.prisma.$transaction(
      prepared.map((data) =>
        this.prisma.class.create({ data, select: CLASS_SELECT }),
      ),
    );

    // Auto-payment for manually added classes that have a price
    const pricePerClass = items[0]?.pricePerClass;
    const groupId = items[0]?.groupId;
    if (pricePerClass && groupId) {
      const total = (Number(pricePerClass) * items.length).toFixed(2);
      const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const first = new Date(items[0].scheduledAt);
      const last = new Date(items[items.length - 1].scheduledAt);
      const fmt = (d: Date) =>
        d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' });
      const description = `${items[0].title} — ${fmt(first)}${items.length > 1 ? ` – ${fmt(last)}` : ''} (${items.length} lekcji × ${Number(pricePerClass).toFixed(0)} PLN)`;

      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        include: {
          students: { where: { isActive: true }, select: { studentId: true } },
        },
      });

      if (group?.students.length) {
        await this.prisma.$transaction(
          group.students.map((gs) =>
            this.prisma.payment.create({
              data: {
                studentId: gs.studentId,
                amount: total,
                currency: 'PLN',
                description,
                dueDate,
              },
            }),
          ),
        );
      }
    }

    await this.calendar.attach(created.map((c) => c.id));
    return this.prisma.class.findMany({
      where: { id: { in: created.map((c) => c.id) } },
      select: CLASS_SELECT,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async updateBatch(batchId: string, dto: UpdateBatchDto) {
    const classes = await this.prisma.class.findMany({
      where: { batchId },
      select: { id: true, scheduledAt: true },
      orderBy: { scheduledAt: 'asc' },
    });
    if (classes.length === 0)
      throw new NotFoundException(`Batch ${batchId} not found`);

    const { scheduledAtTemplate, ...scalarFields } = dto;

    if (scheduledAtTemplate) {
      const template = new Date(scheduledAtTemplate);
      const firstClass = classes[0].scheduledAt;
      // Day shift = difference in whole days between template and first occurrence
      const MS_PER_DAY = 24 * 60 * 60 * 1000;
      const dayShift = Math.round(
        (Date.UTC(
          template.getUTCFullYear(),
          template.getUTCMonth(),
          template.getUTCDate(),
        ) -
          Date.UTC(
            firstClass.getUTCFullYear(),
            firstClass.getUTCMonth(),
            firstClass.getUTCDate(),
          )) /
          MS_PER_DAY,
      );
      const newHour = template.getUTCHours();
      const newMinute = template.getUTCMinutes();

      await this.prisma.$transaction(
        classes.map((cls) => {
          const d = new Date(cls.scheduledAt);
          d.setUTCDate(d.getUTCDate() + dayShift);
          d.setUTCHours(newHour, newMinute, 0, 0);
          return this.prisma.class.update({
            where: { id: cls.id },
            data: { ...scalarFields, scheduledAt: d },
            select: CLASS_SELECT,
          });
        }),
      );
    } else {
      await this.prisma.class.updateMany({
        where: { batchId },
        data: scalarFields,
      });
    }

    // Przesunięcie dat całej serii — bez tego kalendarz zostaje przy starych.
    await this.calendar.sync(await this.calendar.classIdsInBatch(batchId));

    return this.prisma.class.findMany({
      where: { batchId },
      select: CLASS_SELECT,
      orderBy: { scheduledAt: 'asc' },
    });
  }

  async removeBatch(batchId: string) {
    // PRZED usunięciem — potem nie ma skąd wziąć googleEventId.
    await this.calendar.detach(await this.calendar.classIdsInBatch(batchId));
    await this.prisma.attendance.deleteMany({ where: { class: { batchId } } });
    await this.prisma.class.deleteMany({ where: { batchId } });
  }

  async updateStatus(id: string, status: ClassStatus, cancelReason?: string) {
    await this.assertExists(id);
    const updated = await this.prisma.class.update({
      where: { id },
      data: { status, ...(cancelReason && { cancelReason }) },
      select: CLASS_SELECT,
    });

    if (status === 'CANCELLED') {
      const studentIds = await this.getClassStudentIds(updated);
      const reason = updated.cancelReason
        ? ` Powód: ${updated.cancelReason}.`
        : '';
      await this.notifications.notifyStudents(
        studentIds,
        'CLASS_CANCELLED',
        'Zajęcia odwołane',
        `Zajęcia „${updated.title}" (${formatPlDateTime(updated.scheduledAt)}) zostały odwołane.${reason}`,
      );

      // Odwołana lekcja nie może dalej widnieć w kalendarzu jako aktualna.
      await this.calendar.detach([id]);
    }

    return updated;
  }

  /** Uczniowie danych zajęć: 1:1 → pojedynczy uczeń; grupowe → aktywni członkowie grupy. */
  private async getClassStudentIds(cls: {
    student?: { id: string } | null;
    group?: { id: string } | null;
  }): Promise<string[]> {
    if (cls.student?.id) return [cls.student.id];
    if (cls.group?.id) {
      const members = await this.prisma.groupStudent.findMany({
        where: { groupId: cls.group.id, isActive: true },
        select: { studentId: true },
      });
      return members.map((m) => m.studentId);
    }
    return [];
  }

  private async assertExists(id: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!cls) throw new NotFoundException(`Class ${id} not found`);
  }
}
