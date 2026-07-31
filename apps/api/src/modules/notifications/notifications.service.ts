import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { InAppNotificationsService } from './in-app-notifications.service';
import {
  formatPlDateTime,
  formatPlDate,
  formatPlTime,
} from '../../common/utils/format-date';

interface Recipient {
  email: string;
  studentName: string;
}

/**
 * Orkiestrator powiadomień o zdarzeniach dotyczących ucznia. Dla każdego
 * zdarzenia uruchamia DWA kanały:
 *  - e-mail (`MailService`) — routing wg pełnoletności (minor → rodzic),
 *  - in-app (`InAppNotificationsService`) — wiersz w tabeli `Notification`
 *    dla ucznia i powiązanych rodziców (dzwonek na froncie).
 *
 * Zapis in-app jest niezależny od dostarczalności maila (minor bez rodzica i
 * tak dostaje wpis in-app). Metody `notify*` NIGDY nie rzucają wyjątku do
 * wywołującego — błąd powiadomienia nie może zepsuć logiki biznesowej.
 */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly inApp: InAppNotificationsService,
  ) {}

  // ── Routing odbiorcy e-mail ─────────────────────────────────────────────────

  private async resolveRecipient(studentId: string): Promise<Recipient | null> {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true, email: true, isMinor: true },
    });
    if (!student) return null;

    const studentName = `${student.firstName} ${student.lastName}`;

    if (!student.isMinor) {
      return { email: student.email, studentName };
    }

    const link = await this.prisma.parentStudent.findFirst({
      where: { studentId },
      select: { parent: { select: { email: true } } },
    });
    if (!link) {
      this.logger.warn(
        `Uczeń niepełnoletni ${studentId} bez powiązanego rodzica — pomijam e-mail`,
      );
      return null;
    }
    return { email: link.parent.email, studentName };
  }

  // ── Event-driven (wołane z innych serwisów) ─────────────────────────────────

  async notifyAbsence(
    studentId: string,
    cls: { title: string; scheduledAt: Date },
  ): Promise<void> {
    try {
      await this.inApp.notifyStudents(
        [studentId],
        'ATTENDANCE_ALERT',
        'Odnotowano nieobecność',
        `Odnotowano nieobecność na zajęciach „${cls.title}" (${formatPlDateTime(cls.scheduledAt)}).`,
      );
      const r = await this.resolveRecipient(studentId);
      if (!r) return;
      await this.mail.sendAbsenceNotification({
        to: r.email,
        studentName: r.studentName,
        classTitle: cls.title,
        scheduledAt: cls.scheduledAt,
      });
    } catch (e) {
      this.logger.error(
        `notifyAbsence nie powiodło się dla ${studentId}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }

  async notifyPaymentConfirmation(
    studentId: string,
    payment: { amount: string; currency: string; description: string },
  ): Promise<void> {
    try {
      await this.inApp.notifyStudents(
        [studentId],
        'PAYMENT_REMINDER',
        'Płatność zaksięgowana',
        `Zaksięgowano płatność ${Number(payment.amount).toFixed(2)} ${payment.currency} (${payment.description}).`,
      );
      const r = await this.resolveRecipient(studentId);
      if (!r) return;
      await this.mail.sendPaymentConfirmation({
        to: r.email,
        studentName: r.studentName,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
      });
    } catch (e) {
      this.logger.error(
        `notifyPaymentConfirmation nie powiodło się dla ${studentId}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }

  async notifyPaymentOverdue(
    studentId: string,
    payment: {
      amount: string;
      currency: string;
      description: string;
      dueDate: Date;
    },
  ): Promise<void> {
    try {
      await this.inApp.notifyStudents(
        [studentId],
        'PAYMENT_REMINDER',
        'Zaległa płatność',
        `Płatność ${Number(payment.amount).toFixed(2)} ${payment.currency} (termin ${formatPlDate(payment.dueDate)}) jest zaległa. Prosimy o uregulowanie.`,
      );
      const r = await this.resolveRecipient(studentId);
      if (!r) return;
      await this.mail.sendPaymentOverdue({
        to: r.email,
        studentName: r.studentName,
        amount: payment.amount,
        currency: payment.currency,
        description: payment.description,
        dueDate: payment.dueDate,
      });
    } catch (e) {
      this.logger.error(
        `notifyPaymentOverdue nie powiodło się dla ${studentId}`,
        e instanceof Error ? e.stack : undefined,
      );
    }
  }

  // ── Crony ───────────────────────────────────────────────────────────────────

  /** Przypomnienie ~30 min przed zajęciami (mail + in-app). Granulacja co 5 min. */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async sendUpcomingClassReminders(): Promise<void> {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 60 * 1000);

    const classes = await this.prisma.class.findMany({
      where: {
        status: 'SCHEDULED',
        reminderSentAt: null,
        scheduledAt: { gt: now, lte: in30 },
      },
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        meetLink: true,
        teacher: { select: { firstName: true, lastName: true } },
        student: { select: { id: true } },
        group: {
          select: {
            teacher: { select: { firstName: true, lastName: true } },
            students: {
              where: { isActive: true },
              select: { studentId: true },
            },
          },
        },
      },
    });

    for (const cls of classes) {
      const teacher = cls.teacher ?? cls.group?.teacher;
      const teacherName = teacher
        ? `${teacher.firstName} ${teacher.lastName}`
        : 'Lektor';
      const studentIds = cls.group
        ? cls.group.students.map((s) => s.studentId)
        : cls.student
          ? [cls.student.id]
          : [];

      // in-app: jeden zapis dla wszystkich uczniów + rodziców
      await this.inApp.notifyStudents(
        studentIds,
        'CLASS_REMINDER',
        'Przypomnienie o zajęciach',
        `Zajęcia „${cls.title}" zaczynają się o ${formatPlTime(cls.scheduledAt)}.`,
      );

      for (const studentId of studentIds) {
        try {
          const r = await this.resolveRecipient(studentId);
          if (!r) continue;
          await this.mail.sendClassReminder({
            to: r.email,
            studentName: r.studentName,
            classTitle: cls.title,
            scheduledAt: cls.scheduledAt,
            meetLink: cls.meetLink ?? undefined,
            teacherName,
          });
        } catch (e) {
          this.logger.error(
            `Przypomnienie o zajęciach ${cls.id} nie powiodło się dla ${studentId}`,
            e instanceof Error ? e.stack : undefined,
          );
        }
      }

      // Oznacz jako wysłane niezależnie od pojedynczych błędów — bez spamu przy retry
      await this.prisma.class.update({
        where: { id: cls.id },
        data: { reminderSentAt: new Date() },
      });
    }

    if (classes.length > 0) {
      this.logger.log(
        `Wysłano przypomnienia dla ${classes.length} nadchodzących zajęć`,
      );
    }
  }

  /** Przypomnienie o płatności z terminem za <= 3 dni (mail + in-app). Raz dziennie. */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async sendUpcomingPaymentReminders(): Promise<void> {
    const now = new Date();
    const in3days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const payments = await this.prisma.payment.findMany({
      where: {
        status: 'PENDING',
        reminderSentAt: null,
        dueDate: { gte: now, lte: in3days },
      },
      select: {
        id: true,
        studentId: true,
        amount: true,
        currency: true,
        description: true,
        dueDate: true,
      },
    });

    for (const p of payments) {
      try {
        await this.inApp.notifyStudents(
          [p.studentId],
          'PAYMENT_REMINDER',
          'Zbliża się termin płatności',
          `Płatność ${Number(p.amount).toFixed(2)} ${p.currency} (${p.description}) — termin ${formatPlDate(p.dueDate)}.`,
        );
        const r = await this.resolveRecipient(p.studentId);
        if (r) {
          await this.mail.sendPaymentReminder({
            to: r.email,
            studentName: r.studentName,
            amount: p.amount.toString(),
            currency: p.currency,
            description: p.description,
            dueDate: p.dueDate,
          });
        }
      } catch (e) {
        this.logger.error(
          `Przypomnienie o płatności ${p.id} nie powiodło się`,
          e instanceof Error ? e.stack : undefined,
        );
      }
      await this.prisma.payment.update({
        where: { id: p.id },
        data: { reminderSentAt: new Date() },
      });
    }

    if (payments.length > 0) {
      this.logger.log(
        `Wysłano przypomnienia o ${payments.length} zbliżających się płatnościach`,
      );
    }
  }
}
