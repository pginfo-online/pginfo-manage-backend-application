import type { Request } from 'express';
import type { AdminRequestMetadata } from '../application/admin-audit.service.js';
export declare function adminRequestMetadata(request: Request): AdminRequestMetadata;
