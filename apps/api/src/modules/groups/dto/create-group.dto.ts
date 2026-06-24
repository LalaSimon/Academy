import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

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
}
