import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { MailService } from './mail.service';

@Controller('mail')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MailController {
  constructor(
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  @Post('test')
  async test(@Body() body: { type?: string; to?: string }) {
    if (this.config.get('NODE_ENV') !== 'development') {
      return { error: 'Only available in development' };
    }

    const to = body.to ?? 'lalaszymon@gmail.com';
    const type = body.type ?? 'reminder';

    if (type === 'reminder') {
      await this.mail.sendClassReminder({
        to,
        studentName: 'Jan Nowak',
        classTitle: 'Angielski B1 — Present Perfect',
        scheduledAt: new Date(Date.now() + 30 * 60 * 1000),
        meetLink: 'https://meet.google.com/abc-defg-hij',
        teacherName: 'Anna Kowalska',
      });
    } else if (type === 'absence') {
      await this.mail.sendAbsenceNotification({
        to,
        studentName: 'Jan Nowak',
        classTitle: 'Angielski B1 — Słownictwo',
        scheduledAt: new Date(),
      });
    } else if (type === 'payment-reminder') {
      await this.mail.sendPaymentReminder({
        to,
        studentName: 'Jan Nowak',
        amount: '150',
        currency: 'PLN',
        description: 'Zajęcia — lipiec 2025',
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      });
    } else if (type === 'payment-confirmation') {
      await this.mail.sendPaymentConfirmation({
        to,
        studentName: 'Jan Nowak',
        amount: '150',
        currency: 'PLN',
        description: 'Zajęcia — lipiec 2025',
      });
    }

    return { ok: true, type, to };
  }
}
