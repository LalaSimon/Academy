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

      const call = mockPrisma.user.findMany.mock.calls[0][0] as { where: unknown };
      expect(call.where).toHaveProperty('OR');
    });
  });

  describe('findOne', () => {
    it('should return user with relations', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, studentGroups: [], asParent: [], asStudent: [] });

      const result = await service.findOne('user-1');
      expect(result.id).toBe('user-1');
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('bad-id')).rejects.toThrow(NotFoundException);
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
        expect.objectContaining({ data: expect.objectContaining({ passwordHash: 'hashed' }) }),
      );
      expect(result).toEqual(mockUser);
    });

    it('should throw ConflictException if email taken', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(
        service.create({ email: 'test@test.com', password: 'x', firstName: 'A', lastName: 'B', role: Role.STUDENT }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('should update user fields', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, studentGroups: [], asParent: [], asStudent: [] });
      mockPrisma.user.update.mockResolvedValue({ ...mockUser, firstName: 'Piotr' });

      const result = await service.update('user-1', { firstName: 'Piotr' });
      expect(result.firstName).toBe('Piotr');
    });

    it('should throw NotFoundException for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.update('bad', {})).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete existing user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, studentGroups: [], asParent: [], asStudent: [] });
      mockPrisma.user.delete.mockResolvedValue(mockUser);

      await service.remove('user-1');
      expect(mockPrisma.user.delete).toHaveBeenCalledWith({ where: { id: 'user-1' } });
    });

    it('should throw NotFoundException for unknown user', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('linkParentStudent', () => {
    it('should upsert parent-student link', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ ...mockUser, studentGroups: [], asParent: [], asStudent: [] });
      mockPrisma.parentStudent.upsert.mockResolvedValue({ parentId: 'p1', studentId: 's1' });

      await service.linkParentStudent('p1', 's1');
      expect(mockPrisma.parentStudent.upsert).toHaveBeenCalled();
    });
  });
});
