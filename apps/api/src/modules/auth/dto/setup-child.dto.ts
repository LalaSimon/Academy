import { IsString, MinLength, MaxLength } from 'class-validator';

export class SetupChildDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  firstName: string;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  lastName: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;
}
