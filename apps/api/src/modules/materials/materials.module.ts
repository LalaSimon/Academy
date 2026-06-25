import { Module } from '@nestjs/common';
import { MaterialsController } from './materials.controller';
import { MaterialsService } from './materials.service';
import { MinioService } from './minio.service';

@Module({
  controllers: [MaterialsController],
  providers: [MaterialsService, MinioService],
})
export class MaterialsModule {}
