import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { GroupQueryDto } from './dto/group-query.dto';
import { GroupScheduleDto } from './dto/group-schedule.dto';
import { GroupsService } from './groups.service';

@Controller('groups')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GroupsController {
  constructor(private groupsService: GroupsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER)
  findAll(@Query() query: GroupQueryDto) {
    return this.groupsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  findOne(@Param('id') id: string) {
    return this.groupsService.findOne(id);
  }

  @Post()
  @Roles(Role.ADMIN)
  create(@Body() dto: CreateGroupDto) {
    return this.groupsService.create(dto);
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateGroupDto) {
    return this.groupsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.groupsService.remove(id);
  }

  @Post(':id/students/:studentId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  addStudent(@Param('id') id: string, @Param('studentId') studentId: string) {
    return this.groupsService.addStudent(id, studentId);
  }

  @Delete(':id/students/:studentId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStudent(
    @Param('id') id: string,
    @Param('studentId') studentId: string,
  ) {
    return this.groupsService.removeStudent(id, studentId);
  }

  @Post(':id/schedule')
  @Roles(Role.ADMIN)
  addSchedule(@Param('id') id: string, @Body() dto: GroupScheduleDto) {
    return this.groupsService.addSchedule(id, dto);
  }

  @Delete(':id/schedule/:scheduleId')
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeSchedule(
    @Param('id') id: string,
    @Param('scheduleId') scheduleId: string,
  ) {
    return this.groupsService.removeSchedule(id, scheduleId);
  }

  @Post(':id/generate-classes')
  @Roles(Role.ADMIN)
  generateClasses(
    @Param('id') id: string,
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
  ) {
    return this.groupsService.generateClasses(id, year, month);
  }
}
