import { Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface.js';
import { CloudinaryStorageService } from './cloudinary-storage.service.js';

@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: CloudinaryStorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}
