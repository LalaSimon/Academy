import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BulkUpdateAttendanceDto } from './dto/bulk-update-attendance.dto';

const ATTENDANCE_SELECT = {
  id: true,
  status: true,
  note: true,
  markedAt: true,
  student: {
    select: { id: true, firstName: true, lastName: true, email: true },
  },
} as const;

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getForClass(classId: string) {
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: {
        id: true,
        group: {
          select: {
            students: {
              where: { isActive: true },
              select: {
                student: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    if (!cls) throw new NotFoundException(`Class ${classId} not found`);

    const existingMap = new Map(
      (
        await this.prisma.attendance.findMany({
          where: { classId },
          select: ATTENDANCE_SELECT,
        })
      ).map((a) => [a.student.id, a]),
    );

    // Auto-create missing records for active group students
    const missing = (cls.group?.students ?? [])
      .map((gs) => gs.student)
      .filter((s) => !existingMap.has(s.id));

    if (missing.length > 0) {
      await this.prisma.attendance.createMany({
        data: missing.map((s) => ({ classId, studentId: s.id })),
        skipDuplicates: true,
      });
    }

    return this.prisma.attendance.findMany({
      where: { classId },
      select: ATTENDANCE_SELECT,
      orderBy: { student: { lastName: 'asc' } },
    });
  }

  async bulkUpdate(dto: BulkUpdateAttendanceDto) {
    const cls = await this.prisma.class.findUnique({
      where: { id: dto.classId },
      select: { id: true },
    });
    if (!cls) throw new NotFoundException(`Class ${dto.classId} not found`);

    await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.attendance.upsert({
          where: {
            classId_studentId: {
              classId: dto.classId,
              studentId: item.studentId,
            },
          },
          create: {
            classId: dto.classId,
            studentId: item.studentId,
            status: item.status,
            note: item.note,
            markedAt: new Date(),
          },
          update: {
            status: item.status,
            note: item.note,
            markedAt: new Date(),
          },
          select: ATTENDANCE_SELECT,
        }),
      ),
    );

    return this.getForClass(dto.classId);
  }

  async getStudentStats(studentId: string, range?: { from?: Date; to?: Date }) {
    const dateFilter =
      range?.from || range?.to
        ? {
            class: {
              scheduledAt: {
                ...(range.from && { gte: range.from }),
                ...(range.to && { lte: range.to }),
              },
            },
          }
        : {};

    const [attendances, memberships] = await Promise.all([
      this.prisma.attendance.findMany({
        where: { studentId, ...dateFilter },
        select: {
          status: true,
          markedAt: true,
          class: {
            select: {
              id: true,
              title: true,
              scheduledAt: true,
              group: {
                select: { id: true, name: true, language: true, level: true },
              },
            },
          },
        },
        orderBy: { class: { scheduledAt: 'desc' } },
      }),
      this.prisma.groupStudent.findMany({
        where: { studentId, isActive: true },
        select: {
          group: {
            select: { id: true, name: true, language: true, level: true },
          },
        },
      }),
    ]);

    type GroupEntry = {
      group: {
        id: string;
        name: string;
        language: string | null;
        level: string | null;
      };
      total: number;
      present: number;
      late: number;
      absent: number;
      excused: number;
    };

    const groupMap = new Map<string, GroupEntry>();

    // Seed with all groups only when no date filter is active
    const seedAll = !range?.from && !range?.to;
    for (const m of memberships) {
      if (!seedAll) continue;
      groupMap.set(m.group.id, {
        group: m.group,
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        excused: 0,
      });
    }

    for (const a of attendances) {
      const g = a.class.group;
      if (!g) continue;
      if (!groupMap.has(g.id)) {
        groupMap.set(g.id, {
          group: g,
          total: 0,
          present: 0,
          late: 0,
          absent: 0,
          excused: 0,
        });
      }
      const entry = groupMap.get(g.id)!;
      entry.total++;
      if (a.status === 'PRESENT') entry.present++;
      else if (a.status === 'LATE') entry.late++;
      else if (a.status === 'ABSENT') entry.absent++;
      else if (a.status === 'EXCUSED') entry.excused++;
    }

    const total = attendances.length;
    const present = attendances.filter((a) => a.status === 'PRESENT').length;
    const late = attendances.filter((a) => a.status === 'LATE').length;

    return {
      overall: {
        total,
        present,
        late,
        absent: attendances.filter((a) => a.status === 'ABSENT').length,
        excused: attendances.filter((a) => a.status === 'EXCUSED').length,
        attendanceRate:
          total > 0 ? Math.round(((present + late) / total) * 100) : 0,
      },
      byGroup: Array.from(groupMap.values()).map((entry) => ({
        ...entry,
        attendanceRate:
          entry.total > 0
            ? Math.round(((entry.present + entry.late) / entry.total) * 100)
            : 0,
      })),
      history: attendances,
    };
  }

  async getParentChildIds(parentId: string): Promise<string[]> {
    const links = await this.prisma.parentStudent.findMany({
      where: { parentId },
      select: { studentId: true },
    });
    return links.map((l) => l.studentId);
  }
}
