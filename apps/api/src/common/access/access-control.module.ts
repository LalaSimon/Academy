import { Global, Module } from '@nestjs/common';
import { AccessControlService } from './access-control.service';

// @Global — kontrola dostępu jest przekrojowa, tak jak Prisma i Mail.
@Global()
@Module({
  providers: [AccessControlService],
  exports: [AccessControlService],
})
export class AccessControlModule {}
