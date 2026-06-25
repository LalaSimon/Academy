import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { PrismaService } from '../../../prisma/prisma.service';
import { UsersService } from '../users.service';

jest.mock('argon2', () => ({ hash: jest.fn() }));

const mockUser = {
  id: 'user-1',
  email: 'test@test.com',
  firstName: 'Jan',
  lastName: 'Kowalski',
  phone: null,
  role: Role.STUDENT,
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockPrisma = {
  user: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  parentStudent: {
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  class: {
    findMany: jest.fn(),
  },
};

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(UsersService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated users', async () => {
      mockPrisma.user.findMany.mockResolvedValue([mockUser]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by role', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ role: Role.TEACHER });

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: Role.TEACHER } }),
      );
    });

    it('should search by name/email', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      mockPrisma.user.count.mockResolvedValue(0);

      await service.findAll({ search: 'jan' });

      const call = mockPrisma.user.findMany.mock.calls[0][0] as {
        where: unknown;
      };
      expect(call.where).toHaveProperty('OR');
    });
  });

  describe('findOne', () => {
    it('should return user with relations', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        studentGroups: [],
        asParent: [],
        asStudent: [],
      });

      const result = await service.findOne('user-1');
      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should hash password and create user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      (argon2.hash as jest.Mock).mockResolvedValue('hashed');
      mockPrisma.user.create.mockResolvedValue(mockUser);

      const result = await service.create({
        email: 'new@test.com',
        password: 'Pass1234!',
        firstName: 'Anna',
        lastName: 'Nowak',
        role: Role.STUDENT,
      });

      expect(argon2.hash).toHaveBeenCalledWith('Pass1234!');
      expect(mockPrisma.user.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: 'hashed' }),
        }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({
          email: 'test@test.com',
          password: 'x',
          firstName: 'A',
          lastName: 'B',
          role: Role.STUDENT,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        studentGroups: [],
        asParent: [],
        asStudent: [],
      });
      mockPrisma.user.update.mockResolvedValue({
        ...mockUser,
        firstName: 'Piotr',
      });

      const result = await service.update('user-1', { firstName: 'Piotr' });
      expect(result.firstName).toBe('Piotr');
    });

    it('should throw NotFoundException for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('bad', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        studentGroups: [],
        asParent: [],
        asStudent: [],
      });
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await service.remove('user-1');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'user-1' },
      });
    });

    it('should throw NotFoundException for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkParentStudent', () => {
    it('should upsert parent-student link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        studentGroups: [],
        asParent: [],
        asStudent: [],
      });
      mockPrisma.parentStudent.upsert.mockResolvedValue({
        parentId: 'p1',
        studentId: 's1',
      });

      await service.linkParentStudent('p1', 's1');
      expect(mockPrisma.parentStudent.upsert).toHaveBeenCalled();
    });
  });

  describe('getTeacherStats', () => {
    const group = {
      id: 'g1',
      name: 'Angielski A1',
      language: 'EN',
      level: 'A1',
    };

    const makeClass = (status: string, durationMin = 60, month = 1) => ({
      id: `cls-${Math.random()}`,
      title: 'Zajęcia',
      scheduledAt: new Date(`2026-0${month}-15T10:00:00Z`),
      durationMin,
      status,
      group,
    });

    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        studentGroups: [],
        asParent: [],
        asStudent: [],
      });
    });

    it('should throw NotFoundException for unknown teacher', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getTeacherStats('bad-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should count only COMPLETED classes for hours', async () => {
      mockPrisma.class.findMany.mockResolvedValue([
        makeClass('COMPLETED', 60),
        makeClass('COMPLETED', 90),
        makeClass('SCHEDULED', 60),
        makeClass('CANCELLED', 60),
      ]);

      const result = await service.getTeacherStats('teacher-1');

      expect(result.overall.total).toBe(4);
      expect(result.overall.completed).toBe(2);
      // (60 + 90) / 60 = 2.5
      expect(result.overall.hours).toBe(2.5);
    });

    it('should group classes by calendar month', async () => {
      mockPrisma.class.findMany.mockResolvedValue([
        makeClass('COMPLETED', 60, 1),
        makeClass('COMPLETED', 60, 1),
        makeClass('COMPLETED', 60, 2),
      ]);

      const result = await service.getTeacherStats('teacher-1');

      expect(result.byMonth).toHaveLength(2);
      const jan = result.byMonth.find((m) => m.month === 1);
      const feb = result.byMonth.find((m) => m.month === 2);
      expect(jan?.completed).toBe(2);
      expect(feb?.completed).toBe(1);
    });

    it('should sort months chronologically', async () => {
      mockPrisma.class.findMany.mockResolvedValue([
        makeClass('COMPLETED', 60, 3),
        makeClass('COMPLETED', 60, 1),
        makeClass('COMPLETED', 60, 2),
      ]);

      const result = await service.getTeacherStats('teacher-1');

      expect(result.byMonth.map((m) => m.month)).toEqual([1, 2, 3]);
    });

    it('should group classes by group and sort by completed desc', async () => {
      const group2 = {
        id: 'g2',
        name: 'Angielski B2',
        language: 'EN',
        level: 'B2',
      };
      mockPrisma.class.findMany.mockResolvedValue([
        { ...makeClass('COMPLETED', 60), group },
        { ...makeClass('COMPLETED', 60), group },
        { ...makeClass('COMPLETED', 60), group: group2 },
      ]);

      const result = await service.getTeacherStats('teacher-1');

      expect(result.byGroup).toHaveLength(2);
      expect(result.byGroup[0].group.id).toBe('g1');
      expect(result.byGroup[0].completed).toBe(2);
      expect(result.byGroup[1].completed).toBe(1);
    });

    it('should query both direct teacherId and group-inherited teacherId', async () => {
      mockPrisma.class.findMany.mockResolvedValue([]);

      await service.getTeacherStats('teacher-1');

      expect(mockPrisma.class.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { teacherId: 'teacher-1' },
              { teacherId: null, group: { teacherId: 'teacher-1' } },
            ],
          },
        }),
      );
    });

    it('should apply date filter inside OR branches', async () => {
      mockPrisma.class.findMany.mockResolvedValue([]);

      const from = new Date('2026-01-01');
      const to = new Date('2026-03-31');
      await service.getTeacherStats('teacher-1', { from, to });

      const call = mockPrisma.class.findMany.mock.calls[0][0] as {
        where: { OR: unknown[] };
      };
      expect(call.where.OR).toHaveLength(2);
      // Both OR branches must carry the date filter — not just the top-level where
      (call.where.OR as { scheduledAt?: unknown }[]).forEach((branch) => {
        expect(branch.scheduledAt).toEqual({ gte: from, lte: to });
      });
    });

    it('should return empty stats when teacher has no classes', async () => {
      mockPrisma.class.findMany.mockResolvedValue([]);

      const result = await service.getTeacherStats('teacher-1');

      expect(result.overall.total).toBe(0);
      expect(result.overall.completed).toBe(0);
      expect(result.overall.hours).toBe(0);
      expect(result.byMonth).toHaveLength(0);
      expect(result.byGroup).toHaveLength(0);
    });
  });
});
