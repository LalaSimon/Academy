import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  IsUrl,
  Min,
  Max,
  IsNotEmpty,
  IsDecimal,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateClassDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  scheduledAt: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMin?: number;

  @IsOptional()
  @IsUrl()
  meetLink?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  teacherId?: string;

  @IsOptional()
  @IsDecimal({ decimal_digits: '0,2' })
  pricePerClass?: string;
}
