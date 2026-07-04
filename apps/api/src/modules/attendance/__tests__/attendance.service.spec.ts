import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { AttendanceStatus } from '@prisma/client';
import { AttendanceService } from '../attendance.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../../notifications/notifications.service';

const mockAttendance = {
  id: 'att1',
  status: AttendanceStatus.PRESENT,
  note: null,
  markedAt: new Date(),
  student: {
    id: 'stu1',
    firstName: 'Anna',
    lastName: 'Nowak',
    email: 'anna@test.com',
  },
};

const mockClass = {
  id: 'cls1',
  group: {
    students: [
      {
        student: {
          id: 'stu1',
          firstName: 'Anna',
          lastName: 'Nowak',
          email: 'anna@test.com',
        },
      },
    ],
  },
};

const prismaMock = {
  class: { findUnique: jest.fn() },
  attendance: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    upsert: jest.fn(),
  },
  groupStudent: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const notificationsMock = { notifyStudents: jest.fn() };

describe('AttendanceService', () => {
  let service: AttendanceService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        AttendanceService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: NotificationsService, useValue: notificationsMock },
      ],
    }).compile();
    service = module.get(AttendanceService);
    jest.clearAllMocks();
  });

  describe('getForClass', () => {
    it('returns attendance list for class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.attendance.findMany
        .mockResolvedValueOnce([mockAttendance]) // existing check
        .mockResolvedValueOnce([mockAttendance]); // final result
      const result = await service.getForClass('cls1');
      expect(result).toHaveLength(1);
    });

    it('auto-creates missing attendance records', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.attendance.findMany
        .mockResolvedValueOnce([]) // no existing records
        .mockResolvedValueOnce([mockAttendance]); // after create
      prismaMock.attendance.createMany.mockResolvedValue({ count: 1 });
      await service.getForClass('cls1');
      expect(prismaMock.attendance.createMany).toHaveBeenCalledWith({
        data: [{ classId: 'cls1', studentId: 'stu1' }],
        skipDuplicates: true,
      });
    });

    it('throws NotFoundException for unknown class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(service.getForClass('bad')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('bulkUpdate', () => {
    it('upserts attendance records and returns updated list', async () => {
      prismaMock.class.findUnique.mockResolvedValue({ id: 'cls1' });
      prismaMock.attendance.upsert.mockResolvedValue(mockAttendance);
      // getForClass called at end
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.attendance.findMany
        .mockResolvedValueOnce([mockAttendance])
        .mockResolvedValueOnce([mockAttendance]);

      const result = await service.bulkUpdate({
        classId: 'cls1',
        items: [{ studentId: 'stu1', status: AttendanceStatus.PRESENT }],
      });
      expect(result).toHaveLength(1);
    });

    it('throws NotFoundException for unknown class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(
        service.bulkUpdate({
          classId: 'bad',
          items: [{ studentId: 'stu1', status: AttendanceStatus.PRESENT }],
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getStudentStats', () => {
    it('returns overall stats and history', async () => {
      prismaMock.attendance.findMany.mockResolvedValue([
        {
          status: AttendanceStatus.PRESENT,
          markedAt: new Date(),
          class: {
            id: 'cls1',
            title: 'English A1',
            scheduledAt: new Date(),
            group: {
              id: 'grp1',
              name: 'Grupa A',
              language: 'English',
              level: 'A1',
            },
          },
        },
        {
          status: AttendanceStatus.ABSENT,
          markedAt: new Date(),
          class: {
            id: 'cls2',
            title: 'English A1',
            scheduledAt: new Date(),
            group: {
              id: 'grp1',
              name: 'Grupa A',
              language: 'English',
              level: 'A1',
            },
          },
        },
      ]);
      const result = await service.getStudentStats('stu1');
      expect(result.overall.total).toBe(2);
      expect(result.overall.present).toBe(1);
      expect(result.overall.attendanceRate).toBe(50);
      expect(result.byGroup).toHaveLength(1);
    });

    it('returns 0% rate when no attendances', async () => {
      prismaMock.attendance.findMany.mockResolvedValue([]);
      const result = await service.getStudentStats('stu1');
      expect(result.overall.attendanceRate).toBe(0);
    });
  });
});
