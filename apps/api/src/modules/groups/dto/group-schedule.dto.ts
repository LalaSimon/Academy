import {
  IsInt,
  IsString,
  IsDateString,
  IsOptional,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsDecimal } from 'class-validator';

export class GroupScheduleDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=Mon, 6=Sun

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string; // "HH:MM"

  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMin: number;

  @IsDecimal({ decimal_digits: '0,2' })
  pricePerClass: string;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;
}
