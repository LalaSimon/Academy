import {
  Module,
  MiddlewareConsumer,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AccessControlModule } from './common/access/access-control.module';
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
    // Limity dotyczą wyłącznie endpointów auth (patrz AuthController) — guard
    // nie jest globalny, żeby nie dławić normalnego korzystania z aplikacji.
    // `AUTH_THROTTLE_LIMIT` podnosimy w dev i CI, bo zestaw E2E loguje się
    // kilkanaście razy w ciągu minuty; produkcja zostaje przy domyślnych 10.
    ThrottlerModule.forRoot([
      {
        name: 'auth',
        ttl: 60_000,
        limit: Number(process.env.AUTH_THROTTLE_LIMIT ?? 10),
      },
      {
        // Osobno i ostrzej dla akcji, które WYSYŁAJĄ MAILA — bez tego endpoint
        // działa jak otwarty relay na cudze adresy przez nasze konto Resend.
        name: 'mail',
        ttl: 60_000,
        limit: Number(process.env.MAIL_THROTTLE_LIMIT ?? 3),
      },
    ]),
    PrismaModule,
    AccessControlModule,
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
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RequestLoggerMiddleware)
      .forRoutes({ path: '*path', method: RequestMethod.ALL });
  }
}
