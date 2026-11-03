import {
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import type {
  StorageService,
  UploadOptions,
  UploadResult,
} from './storage.interface.js';

@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly configured: boolean;

  constructor(config: ConfigService) {
    const cloudName = config.get<string>('CLOUDINARY_CLOUD_NAME') ?? '';
    const apiKey = config.get<string>('CLOUDINARY_API_KEY') ?? '';
    const apiSecret = config.get<string>('CLOUDINARY_API_SECRET') ?? '';
    const isCredential = (value: string) =>
      Boolean(value) && !/(your_|placeholder|change-?me)/i.test(value);
    this.configured = [cloudName, apiKey, apiSecret].every(isCredential);
    if (this.configured) {
      cloudinary.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
      });
    }
  }

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    this.assertConfigured();
    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: options.folder,
          public_id: options.filename,
          resource_type: 'auto',
          type: options.isPublic === false ? 'authenticated' : 'upload',
          overwrite: false,
          unique_filename: true,
          use_filename: Boolean(options.filename),
        },
        (error, response) => {
          if (error || !response) {
            reject(
              error ?? new Error('Cloudinary returned no upload response'),
            );
          } else {
            resolve(response);
          }
        },
      );
      stream.end(file);
    }).catch((error: unknown) => {
      throw new InternalServerErrorException('File upload failed', {
        cause: error,
      });
    });

    return {
      url: result.secure_url,
      publicId: result.public_id,
      bytes: result.bytes,
      format: result.format ?? options.contentType ?? 'unknown',
    };
  }

  async delete(publicId: string): Promise<void> {
    this.assertConfigured();
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image',
    });
    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new InternalServerErrorException('File deletion failed');
    }
  }

  async getSignedUrl(
    publicId: string,
    expiresInSeconds = 3600,
  ): Promise<string> {
    this.assertConfigured();
    return cloudinary.url(publicId, {
      secure: true,
      sign_url: true,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    });
  }

  private assertConfigured() {
    if (!this.configured) {
      throw new ServiceUnavailableException(
        'File storage is not configured for this environment',
      );
    }
  }
}
