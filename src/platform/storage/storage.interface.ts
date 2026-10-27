/**
 * Storage service interface — decouples business logic from
 * the specific storage provider (Cloudinary, S3, etc.).
 */
export interface StorageService {
  /**
   * Upload a file and return its URL.
   */
  upload(file: Buffer, options: UploadOptions): Promise<UploadResult>;

  /**
   * Delete a file by its public ID or URL.
   */
  delete(publicId: string): Promise<void>;

  /**
   * Generate a short-lived signed URL for private file access.
   */
  getSignedUrl(publicId: string, expiresInSeconds?: number): Promise<string>;
}

export interface UploadOptions {
  folder: string;
  filename?: string;
  contentType?: string;
  /** Whether the file should be publicly accessible */
  isPublic?: boolean;
  /** Organization ID for scoping */
  organizationId: string;
}

export interface UploadResult {
  url: string;
  publicId: string;
  bytes: number;
  format: string;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';
