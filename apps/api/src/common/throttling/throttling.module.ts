import { Global, Module } from '@nestjs/common';
import { EmailRateLimitService } from './email-rate-limit.service';

// @Global — limit wysyłki jest przekrojowy, tak jak kontrola dostępu.
@Global()
@Module({
  providers: [EmailRateLimitService],
  exports: [EmailRateLimitService],
})
export class ThrottlingModule {}
