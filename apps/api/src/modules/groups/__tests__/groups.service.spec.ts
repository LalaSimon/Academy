import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../../prisma/prisma.service';
import { GroupsService } from '../groups.service';

const mockGroup = {
  id: 'group-1',
  name: 'English A1',
  description: null,
  language: 'English',
  level: 'A1',
  maxStudents: 10,
  isActive: true,
  createdAt: new Date(),
  teacher: {
    id: 'teacher-1',
    firstName: 'Jan',
    lastName: 'Kowalski',
    email: 't@t.com',
  },
  _count: { students: 3 },
};

const mockPrisma = {
  group: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  groupStudent: {
    upsert: jest.fn(),
    update: jest.fn(),
    deleteMany: jest.fn(),
  },
};

describe('GroupsService', () => {
  let service: GroupsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(GroupsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated groups', async () => {
      mockPrisma.group.findMany.mockResolvedValue([mockGroup]);
      mockPrisma.group.count.mockResolvedValue(1);

      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by language', async () => {
      mockPrisma.group.findMany.mockResolvedValue([]);
      mockPrisma.group.count.mockResolvedValue(0);

      await service.findAll({ language: 'English' });

      const call = mockPrisma.group.findMany.mock.calls[0][0] as {
        where: unknown;
      };
      expect(call.where).toMatchObject({ language: 'English' });
    });

    it('should filter by teacherId', async () => {
      mockPrisma.group.findMany.mockResolvedValue([]);
      mockPrisma.group.count.mockResolvedValue(0);

      await service.findAll({ teacherId: 'teacher-1' });

      const call = mockPrisma.group.findMany.mock.calls[0][0] as {
        where: unknown;
      };
      expect(call.where).toMatchObject({ teacherId: 'teacher-1' });
    });
  });

  describe('findOne', () => {
    it('should return group with students', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({
        ...mockGroup,
        students: [],
      });
      const result = await service.findOne('group-1');
      expect(result.id).toBe('group-1');
    });

    it('should throw NotFoundException for unknown id', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create group', async () => {
      mockPrisma.group.create.mockResolvedValue(mockGroup);
      const result = await service.create({
        name: 'English A1',
        teacherId: 'teacher-1',
      });
      expect(result.name).toBe('English A1');
    });
  });

  describe('update', () => {
    it('should update group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: 'group-1' });
      mockPrisma.group.update.mockResolvedValue({
        ...mockGroup,
        name: 'English B1',
      });
      const result = await service.update('group-1', { name: 'English B1' });
      expect(result.name).toBe('English B1');
    });

    it('should throw NotFoundException for unknown group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      await expect(service.update('bad', {})).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should delete group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: 'group-1' });
      mockPrisma.group.delete.mockResolvedValue(mockGroup);
      await service.remove('group-1');
      expect(mockPrisma.group.delete).toHaveBeenCalledWith({
        where: { id: 'group-1' },
      });
    });

    it('should throw NotFoundException for unknown group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue(null);
      await expect(service.remove('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('addStudent / removeStudent', () => {
    it('should upsert student into group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: 'group-1' });
      mockPrisma.groupStudent.upsert.mockResolvedValue({
        groupId: 'group-1',
        studentId: 'student-1',
      });
      await service.addStudent('group-1', 'student-1');
      expect(mockPrisma.groupStudent.upsert).toHaveBeenCalled();
    });

    it('should soft-remove student from group', async () => {
      mockPrisma.group.findUnique.mockResolvedValue({ id: 'group-1' });
      mockPrisma.groupStudent.update.mockResolvedValue({});
      await service.removeStudent('group-1', 'student-1');
      expect(mockPrisma.groupStudent.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { isActive: false } }),
      );
    });
  });
});
