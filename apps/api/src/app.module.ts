import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { GroupsModule } from './modules/groups/groups.module';
import { ClassesModule } from './modules/classes/classes.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { MailModule } from './modules/mail/mail.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    ClassesModule,
    AttendanceModule,
    MaterialsModule,
    PaymentsModule,
  ],
})
export class AppModule {}
