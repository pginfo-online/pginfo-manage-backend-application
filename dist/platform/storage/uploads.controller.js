var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Controller, Inject, Post, Query, UploadedFile, UseGuards, UseInterceptors, } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags, } from '@nestjs/swagger';
import { CurrentOrgId, JwtAuthGuard } from '../authentication/index.js';
import { OrgRolesGuard, RequireOrgGuard } from '../authorization/index.js';
import { STORAGE_SERVICE } from './storage.interface.js';
const allowedPurposes = new Set([
    'payment-proof',
    'expense-receipt',
    'complaint',
    'tenant-document',
]);
const allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
]);
function hasValidSignature(file) {
    const bytes = file.buffer;
    if (file.mimetype === 'image/jpeg') {
        return (bytes.length >= 3 &&
            bytes[0] === 0xff &&
            bytes[1] === 0xd8 &&
            bytes[2] === 0xff);
    }
    if (file.mimetype === 'image/png') {
        return bytes
            .subarray(0, 8)
            .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    }
    if (file.mimetype === 'image/webp') {
        return (bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
            bytes.subarray(8, 12).toString('ascii') === 'WEBP');
    }
    return (file.mimetype === 'application/pdf' &&
        bytes.subarray(0, 5).toString('ascii') === '%PDF-');
}
let UploadsController = class UploadsController {
    storage;
    constructor(storage) {
        this.storage = storage;
    }
    async upload(file, purpose, orgId) {
        if (!file)
            throw new BadRequestException('A file is required');
        if (!purpose || !allowedPurposes.has(purpose)) {
            throw new BadRequestException('Invalid upload purpose');
        }
        if (!hasValidSignature(file)) {
            throw new BadRequestException('File content does not match its media type');
        }
        const safeName = file.originalname
            .replace(/\.[^.]+$/, '')
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .slice(0, 80);
        return this.storage.upload(file.buffer, {
            folder: `pginfo/${orgId}/${purpose}`,
            filename: safeName || undefined,
            contentType: file.mimetype,
            organizationId: orgId,
            isPublic: true,
        });
    }
};
__decorate([
    Post(),
    ApiOperation({ summary: 'Upload an organization-scoped image or PDF' }),
    ApiConsumes('multipart/form-data'),
    UseInterceptors(FileInterceptor('file', {
        limits: { fileSize: 10 * 1024 * 1024, files: 1 },
        fileFilter: (_request, file, callback) => {
            const accepted = allowedMimeTypes.has(file.mimetype);
            callback(accepted
                ? null
                : new BadRequestException('Only JPEG, PNG, WebP, and PDF files are allowed'), accepted);
        },
    })),
    __param(0, UploadedFile()),
    __param(1, Query('purpose')),
    __param(2, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], UploadsController.prototype, "upload", null);
UploadsController = __decorate([
    ApiTags('File uploads'),
    Controller('uploads'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __param(0, Inject(STORAGE_SERVICE)),
    __metadata("design:paramtypes", [Object])
], UploadsController);
export { UploadsController };
//# sourceMappingURL=uploads.controller.js.map