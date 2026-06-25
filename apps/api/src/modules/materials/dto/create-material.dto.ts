import { MaterialType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateMaterialDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(MaterialType)
  type: MaterialType;

  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}
