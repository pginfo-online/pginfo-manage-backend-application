import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentOrgId, JwtAuthGuard } from '../authentication/index.js';
import { OrgRolesGuard, RequireOrgGuard } from '../authorization/index.js';
import { STORAGE_SERVICE, type StorageService } from './storage.interface.js';

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

interface UploadedAsset {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

function hasValidSignature(file: UploadedAsset): boolean {
  const bytes = file.buffer;
  if (file.mimetype === 'image/jpeg') {
    return (
      bytes.length >= 3 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff
    );
  }
  if (file.mimetype === 'image/png') {
    return bytes
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }
  if (file.mimetype === 'image/webp') {
    return (
      bytes.subarray(0, 4).toString('ascii') === 'RIFF' &&
      bytes.subarray(8, 12).toString('ascii') === 'WEBP'
    );
  }
  return (
    file.mimetype === 'application/pdf' &&
    bytes.subarray(0, 5).toString('ascii') === '%PDF-'
  );
}

@ApiTags('File uploads')
@Controller('uploads')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class UploadsController {
  constructor(
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Upload an organization-scoped image or PDF' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024, files: 1 },
      fileFilter: (_request, file, callback) => {
        const accepted = allowedMimeTypes.has(file.mimetype);
        callback(
          accepted
            ? null
            : new BadRequestException(
                'Only JPEG, PNG, WebP, and PDF files are allowed',
              ),
          accepted,
        );
      },
    }),
  )
  async upload(
    @UploadedFile() file: UploadedAsset | undefined,
    @Query('purpose') purpose: string | undefined,
    @CurrentOrgId() orgId: string,
  ) {
    if (!file) throw new BadRequestException('A file is required');
    if (!purpose || !allowedPurposes.has(purpose)) {
      throw new BadRequestException('Invalid upload purpose');
    }
    if (!hasValidSignature(file)) {
      throw new BadRequestException(
        'File content does not match its media type',
      );
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
}
