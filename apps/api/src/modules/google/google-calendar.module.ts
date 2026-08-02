import { Global, Module } from '@nestjs/common';
import { GoogleCalendarService } from './google-calendar.service';
import { ClassCalendarService } from './class-calendar.service';

// @Global — z linków Meet korzystają na razie zajęcia, ale docelowo mogą też
// inne moduły (np. konsultacje), a serwis jest bezstanowy.
@Global()
@Module({
  providers: [GoogleCalendarService, ClassCalendarService],
  exports: [GoogleCalendarService, ClassCalendarService],
})
export class GoogleCalendarModule {}
