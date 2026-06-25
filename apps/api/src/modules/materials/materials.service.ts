import { Injectable, NotFoundException } from '@nestjs/common';
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

  async findAll(query: MaterialQueryDto) {
    const { type, search, classId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where = {
      ...(type && { type }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' as const } },
          { description: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
      ...(classId && { classes: { some: { classId } } }),
    };

    const [data, total] = await Promise.all([
      this.prisma.material.findMany({ where, select: MATERIAL_SELECT, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.material.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const m = await this.prisma.material.findUnique({ where: { id }, select: MATERIAL_SELECT });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    return m;
  }

  async create(dto: CreateMaterialDto, uploaderId: string) {
    return this.prisma.material.create({
      data: { ...dto, uploadedBy: uploaderId },
      select: MATERIAL_SELECT,
    });
  }

  async upload(file: Express.Multer.File, title: string, description: string | undefined, uploaderId: string) {
    const ext = file.originalname.split('.').pop() ?? 'bin';
    const key = `materials/${randomUUID()}.${ext}`;
    await this.minio.putObject(key, file.buffer, file.mimetype);

    const type = this.detectType(file.mimetype);
    const url = `/api/v1/materials/file/${key}`;

    return this.prisma.material.create({
      data: { title, description, type, url, fileKey: key, uploadedBy: uploaderId },
      select: MATERIAL_SELECT,
    });
  }

  async getDownloadUrl(id: string) {
    const m = await this.prisma.material.findUnique({ where: { id }, select: { fileKey: true, url: true } });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    if (!m.fileKey) return { url: m.url };
    const url = await this.minio.presignedGetUrl(m.fileKey);
    return { url };
  }

  async remove(id: string) {
    const m = await this.prisma.material.findUnique({ where: { id }, select: { fileKey: true } });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
    await this.prisma.classMaterial.deleteMany({ where: { materialId: id } });
    await this.prisma.material.delete({ where: { id } });
    if (m.fileKey) await this.minio.removeObject(m.fileKey);
  }

  async assignToClass(materialId: string, classId: string) {
    await this.assertMaterialExists(materialId);
    return this.prisma.classMaterial.upsert({
      where: { classId_materialId: { classId, materialId } },
      create: { classId, materialId },
      update: {},
    });
  }

  async removeFromClass(materialId: string, classId: string) {
    await this.prisma.classMaterial.deleteMany({ where: { classId, materialId } });
  }

  async getForClass(classId: string) {
    return this.prisma.material.findMany({
      where: { classes: { some: { classId } } },
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
    const m = await this.prisma.material.findUnique({ where: { id }, select: { id: true } });
    if (!m) throw new NotFoundException(`Material ${id} not found`);
  }
}
