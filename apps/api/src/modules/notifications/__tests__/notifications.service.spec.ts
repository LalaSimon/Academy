import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { NotificationsService } from '../notifications.service';
import { PrismaService } from '../../../prisma/prisma.service';

const prismaMock = {
  notification: {
    create: jest.fn(),
    createMany: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
  parentStudent: {
    findMany: jest.fn().mockResolvedValue([]),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    service = module.get(NotificationsService);
    jest.clearAllMocks();
    prismaMock.parentStudent.findMany.mockResolvedValue([]);
  });

  describe('create', () => {
    it('creates a notification for a single user', async () => {
      prismaMock.notification.create.mockResolvedValue({ id: 'n1' });
      await service.create('u1', 'GENERAL', 'Tytuł', 'Treść');
      expect(prismaMock.notification.create).toHaveBeenCalledWith({
        data: { userId: 'u1', type: 'GENERAL', title: 'Tytuł', body: 'Treść' },
      });
    });
  });

  describe('createMany', () => {
    it('deduplicates user ids and maps rows', async () => {
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });
      await service.createMany(['u1', 'u1', 'u2'], 'GENERAL', 'T', 'B');
      expect(prismaMock.notification.createMany).toHaveBeenCalledWith({
        data: [
          { userId: 'u1', type: 'GENERAL', title: 'T', body: 'B' },
          { userId: 'u2', type: 'GENERAL', title: 'T', body: 'B' },
        ],
      });
    });

    it('no-ops on empty list without hitting prisma', async () => {
      const res = await service.createMany([], 'GENERAL', 'T', 'B');
      expect(res).toEqual({ count: 0 });
      expect(prismaMock.notification.createMany).not.toHaveBeenCalled();
    });
  });

  describe('notifyStudents', () => {
    it('also notifies linked parents', async () => {
      prismaMock.parentStudent.findMany.mockResolvedValue([{ parentId: 'p1' }]);
      prismaMock.notification.createMany.mockResolvedValue({ count: 2 });

      await service.notifyStudents(['stu1'], 'CLASS_CANCELLED', 'T', 'B');

      expect(prismaMock.parentStudent.findMany).toHaveBeenCalledWith({
        where: { studentId: { in: ['stu1'] } },
        select: { parentId: true },
      });
      const arg = prismaMock.notification.createMany.mock.calls[0][0];
      const ids = arg.data.map((d: { userId: string }) => d.userId);
      expect(ids).toEqual(['stu1', 'p1']);
    });

    it('no-ops on empty student list', async () => {
      const res = await service.notifyStudents([], 'GENERAL', 'T', 'B');
      expect(res).toEqual({ count: 0 });
      expect(prismaMock.parentStudent.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('scopes to the user and returns pagination + unread count', async () => {
      prismaMock.notification.findMany.mockResolvedValue([{ id: 'n1' }]);
      prismaMock.notification.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(3); // unread

      const res = await service.findAll('u1', { page: 1, limit: 20 });

      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1' } }),
      );
      expect(res).toEqual({
        data: [{ id: 'n1' }],
        total: 5,
        page: 1,
        limit: 20,
        unreadCount: 3,
      });
    });

    it('filters unread when requested', async () => {
      prismaMock.notification.findMany.mockResolvedValue([]);
      prismaMock.notification.count.mockResolvedValue(0);
      await service.findAll('u1', { unread: true });
      expect(prismaMock.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'u1', isRead: false } }),
      );
    });
  });

  describe('markRead', () => {
    it('marks own notification as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 1 });
      const res = await service.markRead('n1', 'u1');
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { id: 'n1', userId: 'u1' },
        data: { isRead: true },
      });
      expect(res).toEqual({ ok: true });
    });

    it('throws when the notification is not the user’s (count 0)', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 0 });
      await expect(service.markRead('n1', 'u2')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllRead', () => {
    it('marks all unread of the user as read', async () => {
      prismaMock.notification.updateMany.mockResolvedValue({ count: 4 });
      const res = await service.markAllRead('u1');
      expect(prismaMock.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'u1', isRead: false },
        data: { isRead: true },
      });
      expect(res).toEqual({ count: 4 });
    });
  });
});
