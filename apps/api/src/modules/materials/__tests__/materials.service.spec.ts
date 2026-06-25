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
  groupMaterial: {
    upsert: jest.fn(),
    deleteMany: jest.fn(),
  },
  class: {
    findUnique: jest.fn().mockResolvedValue({ groupId: 'g1' }),
  },
  $transaction: jest.fn((ops: unknown[]) => Promise.all(ops)),
};

const minioMock = {
  putObject: jest.fn(),
  getObject: jest.fn(),
  statObject: jest.fn(),
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
        {
          title: 'Test PDF',
          type: MaterialType.PDF,
          url: 'http://example.com/file.pdf',
        },
        'u1',
      );
      expect(result.title).toBe('Test PDF');
      expect(prismaMock.material.create).toHaveBeenCalled();
    });
  });

  describe('streamFile', () => {
    it('streams file from minio', async () => {
      const fakeStream = { pipe: jest.fn() };
      prismaMock.material.findUnique.mockResolvedValue({
        fileKey: 'materials/abc.pdf',
        title: 'Test',
      });
      minioMock.statObject.mockResolvedValue({
        size: 1024,
        metaData: { 'content-type': 'application/pdf' },
      });
      minioMock.getObject.mockResolvedValue(fakeStream);
      const res = {
        setHeader: jest.fn(),
      } as unknown as import('express').Response;
      await service.streamFile('m1', res);
      expect(fakeStream.pipe).toHaveBeenCalledWith(res);
    });

    it('throws 404 if material has no fileKey', async () => {
      prismaMock.material.findUnique.mockResolvedValue({
        fileKey: null,
        title: 'Link',
      });
      const res = {
        setHeader: jest.fn(),
      } as unknown as import('express').Response;
      await expect(service.streamFile('m1', res)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws 404 if material not found', async () => {
      prismaMock.material.findUnique.mockResolvedValue(null);
      const res = {
        setHeader: jest.fn(),
      } as unknown as import('express').Response;
      await expect(service.streamFile('bad', res)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('removes material and minio file', async () => {
      prismaMock.material.findUnique.mockResolvedValue({
        fileKey: 'materials/abc.pdf',
      });
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
    it('upserts class material and auto-assigns to group', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ id: 'm1' });
      prismaMock.classMaterial.upsert.mockResolvedValue({
        classId: 'c1',
        materialId: 'm1',
      });
      prismaMock.groupMaterial.upsert.mockResolvedValue({
        groupId: 'g1',
        materialId: 'm1',
      });
      await service.assignToClass('m1', 'c1');
      expect(prismaMock.$transaction).toHaveBeenCalled();
    });
  });

  describe('assignToGroup', () => {
    it('upserts group material', async () => {
      prismaMock.material.findUnique.mockResolvedValue({ id: 'm1' });
      prismaMock.groupMaterial.upsert.mockResolvedValue({
        groupId: 'g1',
        materialId: 'm1',
      });
      const result = await service.assignToGroup('m1', 'g1');
      expect(result.groupId).toBe('g1');
    });
  });
});
