import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { MaterialsService } from '../materials.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { MinioService } from '../minio.service';
import { MaterialType } from '@prisma/client';

const MATERIAL_STUB = {
  id: 'm1',
  title: 'Test PDF',
  description: null,
  type: MaterialType.PDF,
  url: 'http://example.com/file.pdf',
  fileKey: null,
  isPublic: false,
  createdAt: new Date(),
  uploader: { id: 'u1', firstName: 'Admin', lastName: 'User' },
};

const prismaMock = {
  material: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    delete: jest.fn(),
    count: jest.fn(),
  },
  classMaterial: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const minioMock = {
  putObject: jest.fn(),
  presignedGetUrl: jest.fn(),
  removeObject: jest.fn(),
};

describe('MaterialsService', () => {
  let service: MaterialsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        MaterialsService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: MinioService, useValue: minioMock },
      ],
    }).compile();
    service = module.get(MaterialsService);
  });

  describe('findAll', () => {
    it('returns paginated materials', async () => {
      prismaMock.material.findMany.mockResolvedValue([MATERIAL_STUB]);
      prismaMock.material.count.mockResolvedValue(1);
      const result = await service.findAll({});
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns material by id', async () => {
      prismaMock.material.findUnique.mockResolvedValue(MATERIAL_STUB);
      const result = await service.findOne('m1');
      expect(result.id).toBe('m1');
    });

    it('throws 404 if not found', async () => {
      prismaMock.material.findUnique.mockResolvedValue(null);
      await expect(service.findOne('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('creates external link material', async () => {
      prismaMock.material.create.mockResolvedValue(MATERIAL_STUB);
      const result = await service.create(
        { title: 'Test PDF', type: MaterialType.PDF, url: 'http://example.com/file.pdf' },
        'u1',
      );
      expect(result.title).toBe('Test PDF');
      expect(prismaMock.material.create).toHaveBeenCalled();
    });
  });

  describe('getDownloadUrl', () => {
    it('returns presigned url for file material', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ fileKey: 'materials/abc.pdf', url: '/api/v1/materials/file/materials/abc.pdf' });
      minioMock.presignedGetUrl.mockResolvedValue('https://minio/presigned');
      const result = await service.getDownloadUrl('m1');
      expect(result.url).toBe('https://minio/presigned');
    });

    it('returns original url for external link', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ fileKey: null, url: 'https://youtube.com/watch?v=abc' });
      const result = await service.getDownloadUrl('m1');
      expect(result.url).toBe('https://youtube.com/watch?v=abc');
    });

    it('throws 404 if material not found', async () => {
      prismaMock.material.findUnique.mockResolvedValue(null);
      await expect(service.getDownloadUrl('bad')).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('removes material and minio file', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ fileKey: 'materials/abc.pdf' });
      prismaMock.classMaterial.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.material.delete.mockResolvedValue({});
      await service.remove('m1');
      expect(minioMock.removeObject).toHaveBeenCalledWith('materials/abc.pdf');
    });

    it('removes material without minio file (external link)', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ fileKey: null });
      prismaMock.classMaterial.deleteMany.mockResolvedValue({ count: 0 });
      prismaMock.material.delete.mockResolvedValue({});
      await service.remove('m1');
      expect(minioMock.removeObject).not.toHaveBeenCalled();
    });
  });

  describe('assignToClass', () => {
    it('upserts class material', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ id: 'm1' });
      prismaMock.classMaterial.upsert.mockResolvedValue({ classId: 'c1', materialId: 'm1' });
      const result = await service.assignToClass('m1', 'c1');
      expect(result.classId).toBe('c1');
    });
  });
});
