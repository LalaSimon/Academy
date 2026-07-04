import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

// PrismaModule i MailModule są @Global — nie trzeba ich importować.
@Module({
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
