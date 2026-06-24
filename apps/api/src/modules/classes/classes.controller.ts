import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClassStatus, Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ClassesService } from './classes.service';
import { CreateClassDto } from './dto/create-class.dto';
import { UpdateClassDto } from './dto/update-class.dto';
import { ClassQueryDto } from './dto/class-query.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { CreateBulkClassDto } from './dto/create-bulk-class.dto';

class UpdateStatusDto {
  @IsEnum(ClassStatus)
  status: ClassStatus;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classes')
export class ClassesController {
  constructor(private readonly classesService: ClassesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
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

  @Delete(':id')
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.classesService.remove(id);
  }
}
