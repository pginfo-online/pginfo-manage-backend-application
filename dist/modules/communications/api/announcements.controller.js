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
import { Controller, Post, Get, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { AnnouncementsService } from '../application/announcements.service.js';
import { createAnnouncementSchema, sendRentReminderSchema, queryAnnouncementsSchema, } from './dto/announcement.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let AnnouncementsController = class AnnouncementsController {
    announcementsService;
    constructor(announcementsService) {
        this.announcementsService = announcementsService;
    }
    async create(dto, orgId, userId) {
        return this.announcementsService.create(dto, orgId, userId);
    }
    async findAll(query, orgId) {
        return this.announcementsService.findAll(orgId, query);
    }
    async whatsappReminderHistory(residentId, orgId) {
        return this.announcementsService.whatsappReminderHistory(orgId, residentId);
    }
    async findOne(id, orgId) {
        return this.announcementsService.findById(id, orgId);
    }
    async send(id, orgId, userId) {
        return this.announcementsService.send(id, orgId, userId);
    }
    async sendRentReminders(dto, orgId, userId) {
        return this.announcementsService.sendRentReminders(dto, orgId, userId);
    }
};
__decorate([
    Post(),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Create an announcement notice' }),
    ApiResponse({ status: 201, description: 'Announcement created' }),
    __param(0, Body(new ZodValidationPipe(createAnnouncementSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "create", null);
__decorate([
    Get(),
    ApiOperation({ summary: 'List announcements with pagination' }),
    ApiResponse({ status: 200, description: 'Paginated announcements' }),
    __param(0, Query(new ZodValidationPipe(queryAnnouncementsSchema))),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "findAll", null);
__decorate([
    Get('reminders/whatsapp/:residentId'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    __param(0, Param('residentId', ParseUUIDPipe)),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "whatsappReminderHistory", null);
__decorate([
    Get(':id'),
    ApiOperation({ summary: 'Get details of an announcement' }),
    ApiResponse({ status: 200, description: 'Announcement details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "findOne", null);
__decorate([
    Post(':id/send'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Dispatch announcement via WhatsApp and Email to active residents in scope',
    }),
    ApiResponse({ status: 200, description: 'Announcement dispatched' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "send", null);
__decorate([
    Post('reminders/rent'),
    HttpCode(HttpStatus.OK),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({
        summary: 'Send automated rent reminders via WhatsApp and Email to residents with pending balances',
    }),
    ApiResponse({ status: 200, description: 'Reminders dispatched' }),
    __param(0, Body(new ZodValidationPipe(sendRentReminderSchema))),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], AnnouncementsController.prototype, "sendRentReminders", null);
AnnouncementsController = __decorate([
    ApiTags('Communications & Announcements'),
    Controller('announcements'),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [AnnouncementsService])
], AnnouncementsController);
export { AnnouncementsController };
//# sourceMappingURL=announcements.controller.js.map