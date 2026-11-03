import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { CloudinaryStorageService } from '../../src/platform/storage/cloudinary-storage.service.js';
import { UploadsController } from '../../src/platform/storage/uploads.controller.js';
import type { StorageService } from '../../src/platform/storage/storage.interface.js';

describe('organization-scoped storage', () => {
  it('fails closed when provider credentials are absent', async () => {
    const config = {
      get: vi.fn().mockReturnValue(''),
    } as unknown as ConfigService;
    const storage = new CloudinaryStorageService(config);
    await expect(
      storage.upload(Buffer.from('file'), {
        folder: 'pginfo/org/payment-proof',
        organizationId: 'org',
      }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects missing files and unknown purposes', async () => {
    const storage = { upload: vi.fn() } as unknown as StorageService;
    const controller = new UploadsController(storage);
    await expect(
      controller.upload(undefined, 'payment-proof', 'org'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      controller.upload(
        {
          buffer: Buffer.from('image'),
          mimetype: 'image/jpeg',
          originalname: 'proof.jpg',
          size: 5,
        },
        'unknown',
        'org',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes uploaded assets to the active organization and purpose', async () => {
    const upload = vi.fn().mockResolvedValue({
      url: 'https://cdn.example/proof.jpg',
      publicId: 'proof',
      bytes: 5,
      format: 'jpg',
    });
    const controller = new UploadsController({
      upload,
    } as unknown as StorageService);
    await controller.upload(
      {
        buffer: Buffer.from([0xff, 0xd8, 0xff, 0x00, 0x01]),
        mimetype: 'image/jpeg',
        originalname: '../unsafe proof.jpg',
        size: 5,
      },
      'payment-proof',
      '00000000-0000-4000-8000-000000000001',
    );
    expect(upload).toHaveBeenCalledOnce();
    expect(upload.mock.calls[0]?.[0]).toBeInstanceOf(Buffer);
    expect(upload.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        folder: 'pginfo/00000000-0000-4000-8000-000000000001/payment-proof',
        filename: '---unsafe-proof',
      }),
    );
  });
});
