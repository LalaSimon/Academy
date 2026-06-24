import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ClassStatus } from '@prisma/client';
import { CreateClassDto } from './create-class.dto';

export class UpdateClassDto extends PartialType(OmitType(CreateClassDto, ['groupId'] as const)) {
  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
