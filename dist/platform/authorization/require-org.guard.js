var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Injectable, ForbiddenException, } from '@nestjs/common';
let RequireOrgGuard = class RequireOrgGuard {
    canActivate(context) {
        const request = context
            .switchToHttp()
            .getRequest();
        const user = request.user;
        if (!user?.organizationId) {
            throw new ForbiddenException('An active organization must be selected. Please switch to an organization first.');
        }
        if (!user.organizationAccessActive) {
            throw new ForbiddenException('Organization access is inactive or has been revoked');
        }
        return true;
    }
};
RequireOrgGuard = __decorate([
    Injectable()
], RequireOrgGuard);
export { RequireOrgGuard };
//# sourceMappingURL=require-org.guard.js.map