var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { STORAGE_SERVICE } from './storage.interface.js';
import { CloudinaryStorageService } from './cloudinary-storage.service.js';
import { UploadsController } from './uploads.controller.js';
let StorageModule = class StorageModule {
};
StorageModule = __decorate([
    Module({
        controllers: [UploadsController],
        providers: [
            {
                provide: STORAGE_SERVICE,
                useClass: CloudinaryStorageService,
            },
        ],
        exports: [STORAGE_SERVICE],
    })
], StorageModule);
export { StorageModule };
//# sourceMappingURL=storage.module.js.map