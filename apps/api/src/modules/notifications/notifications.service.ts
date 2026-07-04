import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Emitowanie (wołane z innych serwisów) ─────────────────────────────────

  /** Tworzy powiadomienie dla jednego użytkownika. */
  create(userId: string, type: NotificationType, title: string, body: string) {
    return this.prisma.notification.create({
      data: { userId, type, title, body },
    });
  }

  /** Tworzy to samo powiadomienie dla wielu użytkowników (deduplikacja id). */
  async createMany(
    userIds: string[],
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const unique = [...new Set(userIds)].filter(Boolean);
    if (unique.length === 0) return { count: 0 };
    return this.prisma.notification.createMany({
      data: unique.map((userId) => ({ userId, type, title, body })),
    });
  }

  /**
   * Powiadamia uczniów ORAZ powiązanych rodziców — dzięki temu dzwonek rodzica
   * dostaje zdarzenia dotyczące jego dziecka.
   */
  async notifyStudents(
    studentIds: string[],
    type: NotificationType,
    title: string,
    body: string,
  ) {
    const ids = [...new Set(studentIds)].filter(Boolean);
    if (ids.length === 0) return { count: 0 };
    const parents = await this.prisma.parentStudent.findMany({
      where: { studentId: { in: ids } },
      select: { parentId: true },
    });
    return this.createMany(
      [...ids, ...parents.map((p) => p.parentId)],
      type,
      title,
      body,
    );
  }

  // ── Odczyt (scoped do zalogowanego użytkownika) ───────────────────────────

  async findAll(userId: string, query: QueryNotificationsDto) {
    const { unread, page = 1, limit = 20 } = query;
    const where = { userId, ...(unread ? { isRead: false } : {}) };

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return { data, total, page, limit, unreadCount };
  }

  async unreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(id: string, userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });
    if (result.count === 0) {
      throw new NotFoundException(`Notification ${id} not found`);
    }
    return { ok: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
    return { count: result.count };
  }
}
