export interface StorageService {
    upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;
    delete(publicId: string): Promise<void>;
    getSignedUrl(publicId: string, expiresInSeconds?: number): Promise<string>;
}
export interface UploadOptions {
    folder: string;
    filename?: string;
    contentType?: string;
    isPublic?: boolean;
    organizationId: string;
}
export interface UploadResult {
    url: string;
    publicId: string;
    bytes: number;
    format: string;
}
export declare const STORAGE_SERVICE = "STORAGE_SERVICE";
