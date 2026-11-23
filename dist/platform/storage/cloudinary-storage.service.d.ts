import { ConfigService } from '@nestjs/config';
import type { StorageService, UploadOptions, UploadResult } from './storage.interface.js';
export declare class CloudinaryStorageService implements StorageService {
    private readonly configured;
    constructor(config: ConfigService);
    upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
    delete(publicId: string): Promise<void>;
    getSignedUrl(publicId: string, expiresInSeconds?: number): Promise<string>;
    private assertConfigured;
}
