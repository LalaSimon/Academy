import { IsString, IsOptional, IsDateString, IsInt, IsUrl, Min, Max, IsNotEmpty } from 'class-validator';
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

  @IsString()
  @IsNotEmpty()
  groupId: string;

  @IsOptional()
  @IsString()
  teacherId?: string;
}
