import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ClassStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
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
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findAll(@Query() query: ClassQueryDto) {
    return this.classesService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  findOne(@Param('id') id: string) {
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
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
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
