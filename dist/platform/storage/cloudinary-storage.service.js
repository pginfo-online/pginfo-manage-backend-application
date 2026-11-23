var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Injectable, InternalServerErrorException, ServiceUnavailableException, } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
let CloudinaryStorageService = class CloudinaryStorageService {
    configured;
    constructor(config) {
        const cloudName = config.get('CLOUDINARY_CLOUD_NAME') ?? '';
        const apiKey = config.get('CLOUDINARY_API_KEY') ?? '';
        const apiSecret = config.get('CLOUDINARY_API_SECRET') ?? '';
        const isCredential = (value) => Boolean(value) && !/(your_|placeholder|change-?me)/i.test(value);
        this.configured = [cloudName, apiKey, apiSecret].every(isCredential);
        if (this.configured) {
            cloudinary.config({
                cloud_name: cloudName,
                api_key: apiKey,
                api_secret: apiSecret,
            });
        }
    }
    async upload(file, options) {
        this.assertConfigured();
        const result = await new Promise((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream({
                folder: options.folder,
                public_id: options.filename,
                resource_type: 'auto',
                type: options.isPublic === false ? 'authenticated' : 'upload',
                overwrite: false,
                unique_filename: true,
                use_filename: Boolean(options.filename),
            }, (error, response) => {
                if (error || !response) {
                    reject(error ?? new Error('Cloudinary returned no upload response'));
                }
                else {
                    resolve(response);
                }
            });
            stream.end(file);
        }).catch((error) => {
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
    async delete(publicId) {
        this.assertConfigured();
        for (const resourceType of ['image', 'raw', 'video']) {
            const result = await cloudinary.uploader.destroy(publicId, {
                invalidate: true,
                resource_type: resourceType,
            });
            if (result.result === 'ok')
                return;
            if (result.result !== 'not found') {
                throw new InternalServerErrorException('File deletion failed');
            }
        }
    }
    async getSignedUrl(publicId, expiresInSeconds = 3600) {
        this.assertConfigured();
        return cloudinary.url(publicId, {
            secure: true,
            sign_url: true,
            type: 'authenticated',
            expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
        });
    }
    assertConfigured() {
        if (!this.configured) {
            throw new ServiceUnavailableException('File storage is not configured for this environment');
        }
    }
};
CloudinaryStorageService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [ConfigService])
], CloudinaryStorageService);
export { CloudinaryStorageService };
//# sourceMappingURL=cloudinary-storage.service.js.map