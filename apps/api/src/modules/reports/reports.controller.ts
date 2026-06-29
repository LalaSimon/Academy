import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ReportsService, GeneratedReport } from './reports.service';
import { ReportPaymentsDto } from './dto/report-payments.dto';
import { ReportAttendanceDto } from './dto/report-attendance.dto';
import { ReportStudentsDto } from './dto/report-students.dto';

const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('payments')
  async payments(@Query() query: ReportPaymentsDto, @Res() res: Response) {
    const report = await this.reportsService.paymentsReport(query);
    await this.send(res, report);
  }

  @Get('attendance')
  async attendance(@Query() query: ReportAttendanceDto, @Res() res: Response) {
    const report = await this.reportsService.attendanceReport(query);
    await this.send(res, report);
  }

  @Get('students')
  async students(@Query() query: ReportStudentsDto, @Res() res: Response) {
    const report = await this.reportsService.studentsReport(query);
    await this.send(res, report);
  }

  private async send(res: Response, report: GeneratedReport): Promise<void> {
    res.setHeader('Content-Type', XLSX_MIME);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${report.filename}"`,
    );
    await report.workbook.xlsx.write(res);
    res.end();
  }
}
