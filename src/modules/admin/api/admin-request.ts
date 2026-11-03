import type { Request } from 'express';
import type { AdminRequestMetadata } from '../application/admin-audit.service.js';

export function adminRequestMetadata(request: Request): AdminRequestMetadata {
  return {
    ipAddress: request.ip,
    userAgent: request.headers['user-agent'],
  };
}
