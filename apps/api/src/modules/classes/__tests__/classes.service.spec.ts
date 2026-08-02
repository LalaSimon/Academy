import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClassStatus } from '@prisma/client';
import { ClassesService } from '../classes.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { InAppNotificationsService } from '../../notifications/in-app-notifications.service';
import { ClassCalendarService } from '../../google/class-calendar.service';

const mockClass = {
  id: 'cls1',
  title: 'Angielski A1',
  description: null,
  scheduledAt: new Date('2025-01-15T10:00:00Z'),
  durationMin: 60,
  meetLink: null,
  status: ClassStatus.SCHEDULED,
  cancelReason: null,
  createdAt: new Date(),
  group: {
    id: 'grp1',
    name: 'Grupa A',
    language: 'Angielski',
    level: 'A1',
    teacher: { id: 'tch1', firstName: 'Jan', lastName: 'Kowalski' },
  },
  _count: { attendances: 0 },
};

const prismaMock = {
  class: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
  },
  group: {
    findUnique: jest.fn(),
  },
  groupStudent: {
    findMany: jest.fn().mockResolvedValue([]),
  },
  attendance: {
    deleteMany: jest.fn(),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const notificationsMock = { notifyStudents: jest.fn() };

// Domyślnie integracja wyłączona — tak jak na produkcji bez konfiguracji.
// Kalendarz to dodatek — testy serwisu zajęć nie zależą od Google.
const calendarMock = {
  attach: jest.fn(),
  sync: jest.fn(),
  detach: jest.fn(),
  classIdsInBatch: jest.fn().mockResolvedValue([]),
};

describe('ClassesService', () => {
  let service: ClassesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: InAppNotificationsService, useValue: notificationsMock },
        { provide: ClassCalendarService, useValue: calendarMock },
      ],
    }).compile();
    service = module.get(ClassesService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('returns paginated classes', async () => {
      prismaMock.class.findMany.mockResolvedValue([mockClass]);
      prismaMock.class.count.mockResolvedValue(1);
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('filters by groupId', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({ groupId: 'grp1' });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ groupId: 'grp1' }),
        }),
      );
    });

    it('filters by status', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({ status: ClassStatus.COMPLETED });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: ClassStatus.COMPLETED }),
        }),
      );
    });

    it('filters by date range', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({ from: '2025-01-01', to: '2025-01-31' });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledAt: {
              gte: new Date('2025-01-01'),
              lte: new Date('2025-01-31'),
            },
          }),
        }),
      );
    });

    // Portal nauczyciela: `Class.teacherId` bywa null i prowadzącym jest wtedy
    // nauczyciel grupy — bez gałęzi OR nauczyciel nie zobaczyłby takich zajęć.
    it('filters by teacher including classes inherited from the group', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({ teacherId: 'teacher-1' });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { teacherId: 'teacher-1' },
                  { teacherId: null, group: { teacherId: 'teacher-1' } },
                ],
              },
            ],
          }),
        }),
      );
    });

    it('combines the teacher scope with other filters', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({
        teacherId: 'teacher-1',
        status: ClassStatus.SCHEDULED,
      });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: ClassStatus.SCHEDULED,
            AND: [
              {
                OR: [
                  { teacherId: 'teacher-1' },
                  { teacherId: null, group: { teacherId: 'teacher-1' } },
                ],
              },
            ],
          }),
        }),
      );
    });

    // Uczeń/rodzic: zajęcia grupowe ORAZ 1:1. Te drugie nie mają `groupId`,
    // więc sam filtr po grupach by je zgubił.
    it('scopes a learner to their groups and their own 1:1 classes', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({}, { groupIds: ['g1', 'g2'], studentIds: ['s1'] });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              {
                OR: [
                  { groupId: { in: ['g1', 'g2'] } },
                  { studentId: { in: ['s1'] } },
                ],
              },
            ],
          }),
        }),
      );
    });

    it('keeps the teacher and learner scopes independent in AND', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll(
        { teacherId: 't1' },
        { groupIds: ['g1'], studentIds: ['s1'] },
      );
      const call = prismaMock.class.findMany.mock.calls[0][0] as {
        where: { AND: unknown[] };
      };
      // Oba zawężenia muszą współistnieć — drugie nie może nadpisać pierwszego.
      expect(call.where.AND).toHaveLength(2);
    });

    it('a learner with no groups still sees their 1:1 classes', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({}, { groupIds: [], studentIds: ['s1'] });
      expect(prismaMock.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: [
              { OR: [{ groupId: { in: [] } }, { studentId: { in: ['s1'] } }] },
            ],
          }),
        }),
      );
    });

    it('does not scope by teacher when no teacherId is given', async () => {
      prismaMock.class.findMany.mockResolvedValue([]);
      prismaMock.class.count.mockResolvedValue(0);
      await service.findAll({});
      const call = prismaMock.class.findMany.mock.calls[0][0] as {
        where: Record<string, unknown>;
      };
      expect(call.where.OR).toBeUndefined();
    });
  });

  describe('findOne', () => {
    it('returns class with attendances', async () => {
      prismaMock.class.findUnique.mockResolvedValue({
        ...mockClass,
        attendances: [],
      });
      const result = await service.findOne('cls1');
      expect(result.id).toBe('cls1');
    });

    it('throws NotFoundException for unknown id', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(service.findOne('unknown')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates a class', async () => {
      prismaMock.group.findUnique.mockResolvedValue({ teacherId: 'tch1' });
      prismaMock.class.create.mockResolvedValue(mockClass);
      const result = await service.create({
        title: 'Angielski A1',
        scheduledAt: '2025-01-15T10:00:00Z',
        groupId: 'grp1',
      });
      expect(result.title).toBe('Angielski A1');
    });
  });

  describe('update', () => {
    it('updates a class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.class.update.mockResolvedValue({
        ...mockClass,
        title: 'Updated',
      });
      const result = await service.update('cls1', { title: 'Updated' });
      expect(result.title).toBe('Updated');
    });

    it('throws NotFoundException for unknown id', async () => {
      prismaMock.class.findUnique.mockResolvedValue(null);
      await expect(service.update('unknown', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('deletes attendances then class', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.attendance.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.class.delete.mockResolvedValue(mockClass);
      await service.remove('cls1');
      expect(prismaMock.attendance.deleteMany).toHaveBeenCalledWith({
        where: { classId: 'cls1' },
      });
      expect(prismaMock.class.delete).toHaveBeenCalledWith({
        where: { id: 'cls1' },
      });
    });
  });

  describe('updateStatus', () => {
    it('updates status to COMPLETED', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.class.update.mockResolvedValue({
        ...mockClass,
        status: ClassStatus.COMPLETED,
      });
      const result = await service.updateStatus('cls1', ClassStatus.COMPLETED);
      expect(result.status).toBe(ClassStatus.COMPLETED);
    });

    it('updates status to CANCELLED with reason', async () => {
      prismaMock.class.findUnique.mockResolvedValue(mockClass);
      prismaMock.class.update.mockResolvedValue({
        ...mockClass,
        status: ClassStatus.CANCELLED,
        cancelReason: 'Choroba',
      });
      const result = await service.updateStatus(
        'cls1',
        ClassStatus.CANCELLED,
        'Choroba',
      );
      expect(result.cancelReason).toBe('Choroba');
    });
  });
});
