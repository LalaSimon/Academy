import { MaterialType } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

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
}
