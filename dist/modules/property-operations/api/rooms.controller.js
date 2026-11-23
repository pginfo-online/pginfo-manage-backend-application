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
import { Controller, Post, Get, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus, ParseUUIDPipe, } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, } from '@nestjs/swagger';
import { RoomsService } from '../application/rooms.service.js';
import { createRoomSchema, updateRoomSchema, createBedSchema, updateBedSchema, queryRoomsSchema, } from './dto/room.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import { JwtAuthGuard, CurrentOrgId, CurrentUserId, } from '../../../platform/authentication/index.js';
import { RequireOrgGuard, RequireOrgRoles, OrgRolesGuard, } from '../../../platform/authorization/index.js';
let RoomsController = class RoomsController {
    roomsService;
    constructor(roomsService) {
        this.roomsService = roomsService;
    }
    async createRoom(propertyId, dto, orgId, userId) {
        return this.roomsService.create(propertyId, dto, orgId, userId);
    }
    async findRooms(propertyId, orgId) {
        return this.roomsService.findAll(propertyId, orgId);
    }
    async findRoomsPage(propertyId, query, orgId) {
        return this.roomsService.findAll(propertyId, orgId, query);
    }
    async findOneRoom(id, orgId) {
        return this.roomsService.findById(id, orgId);
    }
    async updateRoom(id, dto, orgId, userId) {
        return this.roomsService.update(id, dto, orgId, userId);
    }
    async getInventoryStats(propertyId, orgId) {
        return this.roomsService.getInventoryStats(propertyId, orgId);
    }
    async toggleDisableRent(id, orgId, userId) {
        return this.roomsService.toggleDisableRent(id, orgId, userId);
    }
    async togglePublish(id, orgId, userId) {
        return this.roomsService.togglePublish(id, orgId, userId);
    }
    async archiveRoom(id, orgId, userId) {
        return this.roomsService.archive(id, orgId, userId);
    }
    async addBed(roomId, dto, orgId, userId) {
        return this.roomsService.addBed(roomId, dto, orgId, userId);
    }
    async updateBed(id, dto, orgId, userId) {
        return this.roomsService.updateBed(id, dto, orgId, userId);
    }
    async archiveBed(id, orgId, userId) {
        return this.roomsService.archiveBed(id, orgId, userId);
    }
};
__decorate([
    Post('properties/:propertyId/rooms'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Create a room within a property' }),
    ApiResponse({ status: 201, description: 'Room created' }),
    __param(0, Param('propertyId', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(createRoomSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "createRoom", null);
__decorate([
    Get('properties/:propertyId/rooms'),
    ApiOperation({ summary: 'List all rooms in a property with beds' }),
    ApiResponse({ status: 200, description: 'List of rooms' }),
    __param(0, Param('propertyId', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "findRooms", null);
__decorate([
    Get('properties/:propertyId/rooms-page'),
    ApiOperation({ summary: 'Search and page rooms in a property' }),
    __param(0, Param('propertyId', new ParseUUIDPipe())),
    __param(1, Query(new ZodValidationPipe(queryRoomsSchema))),
    __param(2, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "findRoomsPage", null);
__decorate([
    Get('rooms/:id'),
    ApiOperation({ summary: 'Get room details' }),
    ApiResponse({ status: 200, description: 'Room details' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "findOneRoom", null);
__decorate([
    Patch('rooms/:id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update room details' }),
    ApiResponse({ status: 200, description: 'Room updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateRoomSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "updateRoom", null);
__decorate([
    Get('properties/:propertyId/inventory-stats'),
    ApiOperation({
        summary: 'Get comprehensive 17-point inventory statistics for a property',
    }),
    ApiResponse({ status: 200, description: 'Inventory statistics' }),
    __param(0, Param('propertyId', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "getInventoryStats", null);
__decorate([
    Patch('rooms/:id/toggle-disable-rent'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Toggle disable/enable room for rent' }),
    ApiResponse({ status: 200, description: 'Room rent availability toggled' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "toggleDisableRent", null);
__decorate([
    Patch('rooms/:id/toggle-publish'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Toggle room publication status' }),
    ApiResponse({ status: 200, description: 'Room publication toggled' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "togglePublish", null);
__decorate([
    Delete('rooms/:id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Archive a room' }),
    ApiResponse({ status: 200, description: 'Room archived' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "archiveRoom", null);
__decorate([
    Post('rooms/:roomId/beds'),
    HttpCode(HttpStatus.CREATED),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Add a bed to a room' }),
    ApiResponse({ status: 201, description: 'Bed created' }),
    __param(0, Param('roomId', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(createBedSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "addBed", null);
__decorate([
    Patch('beds/:id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Update bed details or rent override' }),
    ApiResponse({ status: 200, description: 'Bed updated' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, Body(new ZodValidationPipe(updateBedSchema))),
    __param(2, CurrentOrgId()),
    __param(3, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "updateBed", null);
__decorate([
    Delete('beds/:id'),
    RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER'),
    ApiOperation({ summary: 'Archive a bed' }),
    ApiResponse({ status: 200, description: 'Bed archived' }),
    __param(0, Param('id', new ParseUUIDPipe())),
    __param(1, CurrentOrgId()),
    __param(2, CurrentUserId()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], RoomsController.prototype, "archiveBed", null);
RoomsController = __decorate([
    ApiTags('Rooms & Beds'),
    Controller(),
    UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard),
    ApiBearerAuth('JWT'),
    __metadata("design:paramtypes", [RoomsService])
], RoomsController);
export { RoomsController };
//# sourceMappingURL=rooms.controller.js.map