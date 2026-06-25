import { IsIn, IsOptional, IsString, IsDateString } from 'class-validator';

export class UpdatePaymentStatusDto {
  @IsIn(['PENDING', 'PAID', 'OVERDUE', 'REFUNDED', 'CANCELLED'])
  status: string;
}

export class UpdatePaymentDto {
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}
