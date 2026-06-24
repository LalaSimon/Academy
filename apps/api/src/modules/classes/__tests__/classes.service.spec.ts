import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ClassStatus } from '@prisma/client';
import { ClassesService } from '../classes.service';
import { PrismaService } from '../../../prisma/prisma.service';

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
    count: jest.fn(),
  },
  attendance: {
    deleteMany: jest.fn(),
  },
};

describe('ClassesService', () => {
  let service: ClassesService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        ClassesService,
        { provide: PrismaService, useValue: prismaMock },
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
