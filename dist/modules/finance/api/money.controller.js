var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe, Res, BadRequestException, } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { MoneyService } from '../application/money.service.js';
import { MoneyLinksService } from '../application/money-links.service.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
import { moneyQuerySchema, packageSchema, offerSchema, moneyPaymentSchema, remarkSchema, partySchema, bankLinkSchema, } from './dto/money.dto.js';
let MoneyController = class MoneyController {
    money;
    links;
    constructor(money, links) {
        this.money = money;
        this.links = links;
    }
    createLink(id, org, user) {
        return this.links.create(id, org, user);
    }
    properties(org, q) {
        return this.money.properties(org, q);
    }
    property(id, org) {
        return this.money.property(id, org);
    }
    async report(kind, org, q, res) {
        if (!['dues', 'collections', 'expenses'].includes(kind))
            throw new BadRequestException('Unknown report type');
        if (q.startDate && q.endDate && q.startDate > q.endDate)
            throw new BadRequestException('Invalid date range');
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${kind}.csv"`);
        try {
            for await (const chunk of this.money.report(kind, org, q)) {
                if (res.destroyed)
                    break;
                if (!res.write(chunk)) {
                    await new Promise((resolve) => {
                        const ready = () => {
                            res.off('drain', ready);
                            res.off('close', ready);
                            resolve();
                        };
                        res.once('drain', ready);
                        res.once('close', ready);
                    });
                }
            }
            res.end();
        }
        catch (error) {
            if (res.headersSent) {
                res.destroy(error instanceof Error ? error : undefined);
            }
            else {
                throw error;
            }
        }
    }
    packages(org, q) {
        return this.money.packages(org, q);
    }
    createPackage(org, user, dto) {
        return this.money.savePackage(org, user, dto);
    }
    updatePackage(id, org, user, dto) {
        return this.money.savePackage(org, user, dto, id);
    }
    dues(org, q) {
        return this.money.dues(org, q);
    }
    summary(org, q) {
        return this.money.summary(org, q.propertyId);
    }
    context(id, org) {
        return this.money.paymentContext(id, org);
    }
    reminder(id, org) {
        return this.money.reminder(id, org);
    }
    offer(id, org, user, dto) {
        return this.money.offer(id, org, user, dto);
    }
    remark(id, org, user, dto) {
        return this.money.remark(id, org, user, dto.description);
    }
    record(org, user, dto) {
        return this.money.record(dto, org, user);
    }
    parties(org, q) {
        return this.money.parties(org, q);
    }
    party(org, dto) {
        return this.money.createParty(org, dto.name);
    }
    link(id, org, user, dto) {
        return this.money.linkBank(id, org, user, dto.propertyId);
    }
};
__decorate([
    Post('residents/:id/payment-link'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "createLink", null);
__decorate([
    Get('properties'),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(moneyQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "properties", null);
__decorate([
    Get('properties/:id'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "property", null);
__decorate([
    Get('reports/:kind'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Param('kind')),
    __param(1, CurrentOrgId()),
    __param(2, Query(new ZodValidationPipe(moneyQuerySchema))),
    __param(3, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], MoneyController.prototype, "report", null);
__decorate([
    Get('packages'),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(moneyQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "packages", null);
__decorate([
    Post('packages'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, CurrentOrgId()),
    __param(1, CurrentUserId()),
    __param(2, Body(new ZodValidationPipe(packageSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "createPackage", null);
__decorate([
    Patch('packages/:id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __param(3, Body(new ZodValidationPipe(packageSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "updatePackage", null);
__decorate([
    Get('dues'),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(moneyQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "dues", null);
__decorate([
    Get('summary'),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(moneyQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "summary", null);
__decorate([
    Get('residents/:id/payment-context'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "context", null);
__decorate([
    Get('residents/:id/reminder'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "reminder", null);
__decorate([
    Post('residents/:id/discount'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __param(3, Body(new ZodValidationPipe(offerSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "offer", null);
__decorate([
    Post('residents/:id/remarks'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __param(3, Body(new ZodValidationPipe(remarkSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "remark", null);
__decorate([
    Post('payments'),
    __param(0, CurrentOrgId()),
    __param(1, CurrentUserId()),
    __param(2, Body(new ZodValidationPipe(moneyPaymentSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "record", null);
__decorate([
    Get('parties'),
    __param(0, CurrentOrgId()),
    __param(1, Query(new ZodValidationPipe(moneyQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "parties", null);
__decorate([
    Post('parties'),
    __param(0, CurrentOrgId()),
    __param(1, Body(new ZodValidationPipe(partySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "party", null);
__decorate([
    Patch('banks/:id/property'),
    RequireOrgRoles('OWNER', 'ADMIN'),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __param(3, Body(new ZodValidationPipe(bankLinkSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object]),
    __metadata("design:returntype", void 0)
], MoneyController.prototype, "link", null);
MoneyController = __decorate([
    ApiTags('Money'),
    ApiBearerAuth('JWT'),
    Controller('money'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF'),
    __metadata("design:paramtypes", [MoneyService,
        MoneyLinksService])
], MoneyController);
export { MoneyController };
//# sourceMappingURL=money.controller.js.map