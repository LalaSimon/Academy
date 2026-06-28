import { IsOptional, IsString, IsDateString } from 'class-validator';

export class QueryStatsDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'from musi być poprawną datą ISO 8601 (np. 2026-01-01)' },
  )
  from?: string;

  @IsOptional()
  @IsDateString(
    {},
    { message: 'to musi być poprawną datą ISO 8601 (np. 2026-12-31)' },
  )
  to?: string;
}
