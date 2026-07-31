import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClassStatus } from '@prisma/client';

export class ClassQueryDto {
  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  /**
   * Filtr po nauczycielu. Dla roli TEACHER kontroler i tak nadpisuje tę wartość
   * własnym `req.user.id` — nauczyciel nie może podejrzeć cudzych zajęć.
   */
  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
