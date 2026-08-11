import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { throttlerTiers } from './common/throttling/throttle.config';
import { PrismaModule } from './prisma/prisma.module';
import { AccessControlModule } from './common/access/access-control.module';
import { ThrottlingModule } from './common/throttling/throttling.module';
import { GoogleCalendarModule } from './modules/google/google-calendar.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReportsModule } from './modules/reports/reports.module';
import { MailModule } from './modules/mail/mail.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // Limity obowiązują GLOBALNIE (patrz APP_GUARD niżej). Wcześniej guard był
    // podpięty punktowo w AuthController, więc 167 ze 172 tras — w tym streaming
    // plików, raporty XLSX i tworzenie sesji Stripe — nie miało żadnego limitu.
    // Definicja warstw i uzasadnienie każdej wartości: throttle.config.ts.
    ThrottlerModule.forRoot(throttlerTiers),
    PrismaModule,
    AccessControlModule,
    ThrottlingModule,
    GoogleCalendarModule,
    MailModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    ClassesModule,
    AttendanceModule,
    MaterialsModule,
    PaymentsModule,
    ReportsModule,
    NotificationsModule,
  ],
  providers: [
    // Globalnie, żeby nowa trasa była objęta limitem z automatu — poprzednio
    // ochronę trzeba było pamiętać dodać ręcznie i przy 167 trasach zapomniano.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
