var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from '@nestjs/common';
import { OrganizationsController } from './api/organizations.controller.js';
import { OrganizationsService } from './application/organizations.service.js';
import { IdentityModule } from '../identity/identity.module.js';
let OrganizationsModule = class OrganizationsModule {
};
OrganizationsModule = __decorate([
    Module({
        imports: [IdentityModule],
        controllers: [OrganizationsController],
        providers: [OrganizationsService],
        exports: [OrganizationsService],
    })
], OrganizationsModule);
export { OrganizationsModule };
//# sourceMappingURL=organizations.module.js.map