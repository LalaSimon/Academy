import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { InAppNotificationsService } from './in-app-notifications.service';
import { NotificationsController } from './notifications.controller';

// PrismaModule i MailModule są @Global — nie trzeba ich importować.
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, InAppNotificationsService],
  exports: [NotificationsService, InAppNotificationsService],
})
export class NotificationsModule {}
