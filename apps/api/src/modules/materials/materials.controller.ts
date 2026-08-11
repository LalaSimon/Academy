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
  FileTypeValidator,
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
import {
  ALLOWED_MIME_LIST,
  ALLOWED_MIME_REGEX,
  MAX_UPLOAD_BYTES,
} from './upload.constraints';
import {
  ThrottleDownload,
  ThrottleUpload,
} from '../../common/throttling/throttle.decorators';
import type { Request } from 'express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('materials')
export class MaterialsController {
  constructor(
    private readonly materialsService: MaterialsService,
    private readonly access: AccessControlService,
  ) {}

  // Biblioteka materiałów: admin widzi wszystko, pozostali tylko to, co
  // publiczne, przypisane do ich grup/zajęć albo (nauczyciel) własnego wgrania.
  @Get()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findAll(
    @Query() query: MaterialQueryDto,
    @Req() req: Request & { user: RequestUser },
  ) {
    if (req.user.role === Role.ADMIN) {
      return this.materialsService.findAll(query);
    }
    const [groupIds, classIds] = await Promise.all([
      this.access.getAccessibleGroupIds(req.user),
      this.access.getAccessibleClassIds(req.user),
    ]);
    return this.materialsService.findAll(query, {
      groupIds: groupIds ?? [],
      classIds,
      uploaderId: req.user.role === Role.TEACHER ? req.user.id : undefined,
    });
  }

  /**
   * Materiały dla wielu zajęć naraz (widok „Dzisiaj"). Zamiast ufać liście
   * z query, przecinamy ją z zajęciami, do których użytkownik ma dostęp —
   * podanie cudzego `classId` nic nie da.
   */
  @Get('by-classes')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT, Role.PARENT)
  async getForClasses(
    @Query('classIds') classIds: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    const requested = (classIds ?? '').split(',').filter(Boolean);
    if (requested.length === 0) return {};

    if (req.user.role === Role.ADMIN) {
      return this.materialsService.getForClasses(requested);
    }

    const allowed = new Set(await this.access.getAccessibleClassIds(req.user));
    return this.materialsService.getForClasses(
      requested.filter((id) => allowed.has(id)),
    );
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async findOne(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanReadMaterial(req.user, id);
    return this.materialsService.findOne(id);
  }

  // Egress jest najdroższą pozycją rachunku, a pobranie materiału 50 MB w pętli
  // to jedna linijka w curl-u — uprawnienia tego nie hamują, bo uczeń ma do
  // swoich materiałów legalny dostęp.
  @Get(':id/file')
  @ThrottleDownload()
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async streamFile(
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request & { user: RequestUser },
  ) {
    // Bez tego dało się pobrać plik dowolnego materiału, znając `id`.
    await this.access.assertCanReadMaterial(req.user, id);
    await this.materialsService.streamFile(id, res);
  }

  @Get('class/:classId')
  @Roles(Role.ADMIN, Role.TEACHER, Role.STUDENT)
  async getForClass(
    @Param('classId') classId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanAccessClass(req.user, classId);
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
  @ThrottleUpload()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      // Limit MUSI być tutaj, nie tylko w `ParseFilePipe`. Multer przerywa
      // strumień po przekroczeniu progu; walidator w pipe ogląda dopiero
      // gotowy bufor, więc sam z siebie nie powstrzymał żądania 5 GB przed
      // wylądowaniem w pamięci procesu.
      limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 10 },
    }),
  )
  upload(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_UPLOAD_BYTES }),
          // Allowlista typów — bez niej dawało się wgrać `.html`/`.svg`
          // z aktywnym skryptem pod naszą domeną.
          //
          // `skipMagicNumbersValidation` świadomie: sprawdzamy typ ZADEKLAROWANY,
          // bo to dokładnie ta wartość, którą później odsyłamy w `Content-Type`
          // przy pobieraniu (`streamFile` bierze ją z metadanych MinIO). Skoro
          // `text/html` i `image/svg+xml` nie przejdą tu, przeglądarka nigdy nie
          // dostanie ich od nas — niezależnie od tego, co naprawdę jest w bajtach.
          // Weryfikacja magic numbers wymagałaby doinstalowania pakietu `file-type`
          // (ESM), a i tak odrzucałaby `text/plain` i `text/csv`, które sygnatury
          // nie mają.
          new FileTypeValidator({
            fileType: ALLOWED_MIME_REGEX,
            skipMagicNumbersValidation: true,
            errorMessage: `Niedozwolony typ pliku. Dozwolone: ${ALLOWED_MIME_LIST.join(', ')}`,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('title') title: string,
    @Body('description') description: string,
    @Req() req: Request & { user: { id: string } },
  ) {
    return this.materialsService.upload(file, title, description, req.user.id);
  }

  // Przypięcie materiału publikuje go uczniom zajęć, więc wymaga PRAWA DO OBU
  // stron: do materiału (żeby nie dało się rozesłać cudzego) i do zajęć (żeby
  // nie dało się wstrzelić czegokolwiek w cudzą grupę).
  @Post(':id/classes/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async assignToClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanModifyMaterial(req.user, id);
    await this.access.assertCanAccessClass(req.user, classId);
    return this.materialsService.assignToClass(id, classId);
  }

  @Delete(':id/classes/:classId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async removeFromClass(
    @Param('id') id: string,
    @Param('classId') classId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanModifyMaterial(req.user, id);
    await this.access.assertCanAccessClass(req.user, classId);
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
  async assignToGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanModifyMaterial(req.user, id);
    await this.access.assertCanReadGroup(req.user, groupId);
    return this.materialsService.assignToGroup(id, groupId);
  }

  @Delete(':id/groups/:groupId')
  @Roles(Role.ADMIN, Role.TEACHER)
  async removeFromGroup(
    @Param('id') id: string,
    @Param('groupId') groupId: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanModifyMaterial(req.user, id);
    await this.access.assertCanReadGroup(req.user, groupId);
    return this.materialsService.removeFromGroup(id, groupId);
  }

  // Kasowanie usuwa też plik z MinIO — nieodwracalnie. Bez tego sprawdzenia
  // dowolny nauczyciel kasował materiały kolegów, znając samo `id`.
  @Delete(':id')
  @Roles(Role.ADMIN, Role.TEACHER)
  async remove(
    @Param('id') id: string,
    @Req() req: Request & { user: RequestUser },
  ) {
    await this.access.assertCanModifyMaterial(req.user, id);
    return this.materialsService.remove(id);
  }
}
