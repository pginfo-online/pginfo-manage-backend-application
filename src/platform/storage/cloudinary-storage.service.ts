import { Injectable, Logger } from '@nestjs/common';
import type {
  StorageService,
  UploadOptions,
  UploadResult,
} from './storage.interface.js';

/**
 * Cloudinary storage adapter.
 *
 * NOTE: Full Cloudinary SDK integration will be implemented in a later phase.
 * This is the adapter boundary — business modules interact only through
 * the StorageService interface, never directly with the SDK.
 */
@Injectable()
export class CloudinaryStorageService implements StorageService {
  private readonly logger = new Logger(CloudinaryStorageService.name);

  async upload(file: Buffer, options: UploadOptions): Promise<UploadResult> {
    this.logger.warn(
      `Cloudinary upload called (folder: ${options.folder}) — SDK integration pending`,
    );

    // TODO: Implement with Cloudinary SDK v2
    // const cloudinary = require('cloudinary').v2;
    // cloudinary.config({ ... });

    return {
      url: `https://placeholder.cloudinary.com/${options.folder}/${options.filename ?? 'file'}`,
      publicId: `${options.folder}/${options.filename ?? 'file'}`,
      bytes: file.length,
      format: options.contentType ?? 'unknown',
    };
  }

  async delete(publicId: string): Promise<void> {
    this.logger.warn(
      `Cloudinary delete called (publicId: ${publicId}) — SDK integration pending`,
    );
  }

  async getSignedUrl(
    publicId: string,
    _expiresInSeconds = 3600,
  ): Promise<string> {
    this.logger.warn(
      `Cloudinary signed URL called (publicId: ${publicId}) — SDK integration pending`,
    );
    return `https://placeholder.cloudinary.com/signed/${publicId}`;
  }
}
