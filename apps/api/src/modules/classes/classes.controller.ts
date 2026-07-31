import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ClassStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import {
  AccessControlService,
  type RequestUser,
} from '../../common/access/access-control.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClassesService, UpdateBatchDto } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateBulkClassDto } from './dto/create-bulk-class.dto';

class UpdateStatusDto {
  @IsEnum(ClassStatus)
  status: ClassStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}

class UpdateBatchBodyDto implements UpdateBatchDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() teacherId?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(15)
  @Max(480)
  durationMin?: number;
  @IsOptional() @IsUrl() meetLink?: string;
  @IsOptional() @IsDateString() scheduledAtTemplate?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly access: AccessControlService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  async findAll(
    @Query() query: ClassQueryDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    // Nauczyciel widzi wyłącznie własne zajęcia — nadpisujemy `teacherId`
    // z query, żeby nie dało się go obejść parametrem w URL-u.
    if (req.user.role === Role.TEACHER) {
      return this.classesService.findAll({ ...query, teacherId: req.user.id });
    }

    // Uczeń i rodzic bez zawężenia widzieli harmonogram całej szkoły.
    if (req.user.role === Role.STUDENT || req.user.role === Role.PARENT) {
      const [groupIds, studentIds] = await Promise.all([
        this.access.getAccessibleGroupIds(req.user),
        this.access.getVisibleStudentIds(req.user),
      ]);
      return this.classesService.findAll(query, {
        groupIds: groupIds ?? [],
        studentIds,
      });
    }

    return this.classesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanAccessClass(req.user, id);
    return this.classesService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateClassDto) {
    return this.classesService.create(dto);
  }

  @Post('bulk')
  @Roles(Role.ADMIN)
  createBulk(@Body() dto: CreateBulkClassDto) {
    return this.classesService.createBulk(dto.items);
  }

  @Patch('batch/:batchId')
  @Roles(Role.ADMIN)
  updateBatch(
    @Param('batchId') batchId: string,
    @Body() dto: UpdateBatchBodyDto,
  ) {
    return this.classesService.updateBatch(batchId, dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateClassDto) {
    return this.classesService.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(Role.ADMIN, Role.TEACHER)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    // ZAPIS o trwałych skutkach: odwołanie zajęć rozsyła powiadomienia
    // uczniom grupy. Bez tego nauczyciel mógł odwołać cudze zajęcia.
    await this.access.assertCanAccessClass(req.user, id);
    return this.classesService.updateStatus(id, dto.status, dto.cancelReason);
  }

  @Delete('batch/:batchId')
  @Roles(Role.ADMIN)
  removeBatch(@Param('batchId') batchId: string) {
    return this.classesService.removeBatch(batchId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
