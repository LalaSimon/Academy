import {
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { GroupScheduleDto } from './group-schedule.dto';

export class CreateGroupDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsString()
  level?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  maxStudents?: number;

  @IsString()
  teacherId: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GroupScheduleDto)
  schedules?: GroupScheduleDto[];
}
