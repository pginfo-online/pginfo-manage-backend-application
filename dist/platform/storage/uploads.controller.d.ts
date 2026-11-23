import { type StorageService } from './storage.interface.js';
interface UploadedAsset {
    buffer: Buffer;
    mimetype: string;
    originalname: string;
    size: number;
}
export declare class UploadsController {
    private readonly storage;
    constructor(storage: StorageService);
    upload(file: UploadedAsset | undefined, purpose: string | undefined, orgId: string): Promise<import("./storage.interface.js").UploadResult>;
}
export {};
