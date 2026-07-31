import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { InAppNotificationsService } from './in-app-notifications.service';
import { QueryNotificationsDto } from './dto/query-notifications.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

type AuthedRequest = Request & { user: { id: string; role: string } };

@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: InAppNotificationsService) {}

  @Get()
  findAll(@Query() query: QueryNotificationsDto, @Req() req: AuthedRequest) {
    return this.notifications.findAll(req.user.id, query);
  }

  @Get('unread-count')
  unreadCount(@Req() req: AuthedRequest) {
    return this.notifications.unreadCount(req.user.id);
  }

  @Patch('read-all')
  markAllRead(@Req() req: AuthedRequest) {
    return this.notifications.markAllRead(req.user.id);
  }

  @Patch(':id/read')
  markRead(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.notifications.markRead(id, req.user.id);
  }
}
