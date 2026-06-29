import { IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class ReportPaymentsDto {
  @IsOptional()
  @IsString()
  studentId?: string;

  @IsOptional()
  @IsString()
  groupId?: string;

  @IsOptional()
  @IsIn(['PENDING', 'PAID', 'OVERDUE', 'REFUNDED', 'CANCELLED'])
  status?: string;

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
