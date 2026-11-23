import { type CanActivate, type ExecutionContext } from '@nestjs/common';
export declare class RequireOrgGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean;
}
