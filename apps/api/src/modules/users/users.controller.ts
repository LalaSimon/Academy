import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { IsOptional, IsString } from 'class-validator';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserQueryDto } from './dto/user-query.dto';
import { UsersService } from './users.service';

class TeacherStatsQuery {
  @IsOptional() @IsString() from?: string;
  @IsOptional() @IsString() to?: string;
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id/stats')
  getTeacherStats(@Param('id') id: string, @Query() query: TeacherStatsQuery) {
    return this.usersService.getTeacherStats(id, {
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.STUDENT, Role.PARENT)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: { id: string; role: string } },
  ) {
    if (req.user.role === 'STUDENT' && req.user.id !== id) {
      throw new ForbiddenException();
    }
    if (req.user.role === 'PARENT') {
      const childIds = await this.usersService.getChildIds(req.user.id);
      if (req.user.id !== id && !childIds.includes(id)) {
        throw new ForbiddenException();
      }
    }
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @Post(':parentId/students/:studentId')
  @HttpCode(HttpStatus.CREATED)
  linkParentStudent(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.usersService.linkParentStudent(parentId, studentId);
  }

  @Delete(':parentId/students/:studentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  unlinkParentStudent(
    @Param('parentId') parentId: string,
    @Param('studentId') studentId: string,
  ) {
    return this.usersService.unlinkParentStudent(parentId, studentId);
  }
}
