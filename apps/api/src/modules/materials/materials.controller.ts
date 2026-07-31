import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  ParseFilePipe,
  MaxFileSizeValidator,
} from '@nestjs/common';
import type { Response } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import {
  AccessControlService,
  type RequestUser,
} from '../../common/access/access-control.service';
import { MaterialsService } from './materials.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { MaterialQueryDto } from './dto/material-query.dto';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly access: AccessControlService,
  ) {}

  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findAll(@Query() query: MaterialQueryDto) {
    return this.materialsService.findAll(query);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  findOne(@Param('id') id: string) {
    return this.materialsService.findOne(id);
  }

  @Get(':id/file')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async streamFile(@Param('id') id: string, @Res() res: Response) {
    await this.materialsService.streamFile(id, res);
  }

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  getForClass(@Param('classId') classId: string) {
    return this.materialsService.getForClass(classId);
  }

  @Post()
  @Roles(Role.ADMIN, Role.TEACHER)
  create(
    @Body() dto: CreateMaterialDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.materialsService.create(dto, req.user.id);
  }

  @Post('upload')
  @Roles(Role.ADMIN, Role.TEACHER)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 })],
      }),
    )
    file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.materialsService.upload(file, title, description, req.user.id);
  }

  @Post(':id/classes/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  assignToClass(@Param('id') id: string, @Param('classId') classId: string) {
    return this.materialsService.assignToClass(id, classId);
  }

  @Delete(':id/classes/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  removeFromClass(@Param('id') id: string, @Param('classId') classId: string) {
    return this.materialsService.removeFromClass(id, classId);
  }

  // PARENT dodany: portal rodzica wołał ten endpoint od Fazy 3.2, ale roli
  // brakowało na liście, więc zakładka „Materiały" dziecka zwracała 403.
  @Get('group/:groupId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  async getForGroup(
    @Param('groupId') groupId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanReadGroup(req.user, groupId);
    return this.materialsService.getForGroup(groupId);
  }

  @Post(':id/groups/:groupId')
  @Roles(Role.ADMIN, Role.TEACHER)
  assignToGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.materialsService.assignToGroup(id, groupId);
  }

  @Delete(':id/groups/:groupId')
  @Roles(Role.ADMIN, Role.TEACHER)
  removeFromGroup(@Param('id') id: string, @Param('groupId') groupId: string) {
    return this.materialsService.removeFromGroup(id, groupId);
  }

  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  remove(@Param('id') id: string) {
    return this.materialsService.remove(id);
  }
}
