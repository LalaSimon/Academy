import {
  Controller,
  ForbiddenException,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Role } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { AttendanceService } from './attendance.service';
import { BulkUpdateAttendanceDto } from './dto/bulk-update-attendance.dto';

class ClassIdQuery {
  @IsString()
  classId: string;
}

class StudentStatsQuery {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  getForClass(@Query() query: ClassIdQuery) {
    return this.attendanceService.getForClass(query.classId);
  }

  @Patch('bulk')
  @Roles(Role.ADMIN, Role.TEACHER)
  bulkUpdate(@Body() dto: BulkUpdateAttendanceDto) {
    return this.attendanceService.bulkUpdate(dto);
  }

  @Get('student/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  getStudentStats(
    @Req() req: Request & { user: { id: string; role: string } },
    @Param('studentId') studentId: string,
    @Query() query: StudentStatsQuery,
  ) {
    if (req.user.role === 'STUDENT' && req.user.id !== studentId) {
      throw new ForbiddenException();
    }
    return this.attendanceService.getStudentStats(studentId, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }
}
