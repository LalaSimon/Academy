import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { MinioService } from './minio.service';
import { CreateMaterialDto } from './dto/create-material.dto';
import { MaterialQueryDto } from './dto/material-query.dto';

const MATERIAL_SELECT = {
  id: true,
  title: true,
  description: true,
  type: true,
  url: true,
  fileKey: true,
  isPublic: true,
  createdAt: true,
  uploader: { select: { id: true, firstName: true, lastName: true } },
} as const;

@Injectable()
export class MaterialsService {
  constructor(
    private prisma: PrismaService,
    private minio: MinioService,
  ) {}

  /**
   * `scope` pochodzi z tokenu (nie od klienta) i ogranicza bibliotekę do
   * materiałów, które użytkownik ma prawo widzieć. Brak `scope` = widok admina.
   */
  async findAll(
    query: MaterialQueryDto,
    scope?: { groupIds: string[]; classIds: string[]; uploaderId?: string },
  ) {
    const { type, search, classId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    // Warunki zawężające idą do AND, żeby `OR` wyszukiwarki i `OR` zakresu
    // dostępu się nie nadpisywały.
    const and: Record<string, unknown>[] = [];

    if (search) {
      and.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      });
    }

    if (scope) {
      and.push({
        OR: [
          { isPublic: true },
          { groups: { some: { groupId: { in: scope.groupIds } } } },
          { classes: { some: { classId: { in: scope.classIds } } } },
          ...(scope.uploaderId ? [{ uploadedBy: scope.uploaderId }] : []),
        ],
      });
    }

    const where = {
      ...(type && { type }),
      ...(classId && { classes: { some: { classId } } }),
      ...(and.length > 0 && { AND: and }),
    };

    const [data, total] = await Promise.all([
      this.prisma.material.findMany({
        where,
        select: MATERIAL_SELECT,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.material.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const m = await this.prisma.material.findUnique({
      where: { id },
      select: MATERIAL_SELECT,
    });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    return m;
  }

  async create(dto: CreateMaterialDto, uploaderId: string) {
    return this.prisma.material.create({
      data: { ...dto, uploadedBy: uploaderId },
      select: MATERIAL_SELECT,
    });
  }

  async upload(
    file: Express.Multer.File,
    title: string,
    description: string | undefined,
    uploaderId: string,
  ) {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `materials/${randomUUID()}.${ext}`;
    await this.minio.putObject(key, file.buffer, file.mimetype);

    const type = this.detectType(file.mimetype);
    const url = `/api/v1/materials/file/${key}`;

    return this.prisma.material.create({
      data: {
        title,
        description,
        type,
        url,
        fileKey: key,
        uploadedBy: uploaderId,
      },
      select: MATERIAL_SELECT,
    });
  }

  async streamFile(id: string, res: Response) {
    const m = await this.prisma.material.findUnique({
      where: { id },
      select: { fileKey: true, title: true },
    });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    if (!m.fileKey)
      throw new NotFoundException(
        'This material has no file — it is an external link',
      );

    const stat = await this.minio.statObject(m.fileKey);
    const stream = await this.minio.getObject(m.fileKey);

    const contentType =
      (stat.metaData?.['content-type'] as string | undefined) ??
      'application/octet-stream';
    const ext = m.fileKey.split('.').pop() ?? 'bin';
    const filename = encodeURIComponent(`${m.title}.${ext}`);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename*=UTF-8''${filename}`,
    );

    stream.pipe(res);
  }

  async remove(id: string) {
    const m = await this.prisma.material.findUnique({
      where: { id },
      select: { fileKey: true },
    });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    await this.prisma.classMaterial.deleteMany({ where: { materialId: id } });
    await this.prisma.groupMaterial.deleteMany({ where: { materialId: id } });
    await this.prisma.material.delete({ where: { id } });
    if (m.fileKey) await this.minio.removeObject(m.fileKey);
  }

  async assignToClass(materialId: string, classId: string) {
    await this.assertMaterialExists(materialId);
    const cls = await this.prisma.class.findUnique({
      where: { id: classId },
      select: { groupId: true },
    });
    await this.prisma.$transaction([
      this.prisma.classMaterial.upsert({
        where: { classId_materialId: { classId, materialId } },
        create: { classId, materialId },
        update: {},
      }),
      ...(cls?.groupId
        ? [
            this.prisma.groupMaterial.upsert({
              where: {
                groupId_materialId: { groupId: cls.groupId, materialId },
              },
              create: { groupId: cls.groupId, materialId },
              update: {},
            }),
          ]
        : []),
    ]);
  }

  async removeFromClass(materialId: string, classId: string) {
    await this.prisma.classMaterial.deleteMany({
      where: { classId, materialId },
    });
  }

  async getForClass(classId: string) {
    return this.prisma.material.findMany({
      where: { classes: { some: { classId } } },
      select: MATERIAL_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async assignToGroup(materialId: string, groupId: string) {
    await this.assertMaterialExists(materialId);
    return this.prisma.groupMaterial.upsert({
      where: { groupId_materialId: { groupId, materialId } },
      create: { groupId, materialId },
      update: {},
    });
  }

  async removeFromGroup(materialId: string, groupId: string) {
    await this.prisma.groupMaterial.deleteMany({
      where: { groupId, materialId },
    });
  }

  async getForGroup(groupId: string) {
    return this.prisma.material.findMany({
      where: { groups: { some: { groupId } } },
      select: MATERIAL_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  private detectType(mime: string) {
    if (mime.startsWith('image/')) return 'IMAGE' as const;
    if (mime.startsWith('video/')) return 'VIDEO' as const;
    if (mime.startsWith('audio/')) return 'AUDIO' as const;
    if (mime === 'application/pdf') return 'PDF' as const;
    return 'OTHER' as const;
  }

  private async assertMaterialExists(id: string) {
    const m = await this.prisma.material.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
  }
}
