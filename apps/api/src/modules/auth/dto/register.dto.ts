import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
} from 'class-validator';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsIn(['student', 'parent'])
  accountType: 'student' | 'parent';
}
