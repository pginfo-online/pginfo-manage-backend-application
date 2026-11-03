import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RoomsService } from '../application/rooms.service.js';
import {
  createRoomSchema,
  updateRoomSchema,
  createBedSchema,
  updateBedSchema,
  type CreateRoomDto,
  type UpdateRoomDto,
  type CreateBedDto,
  type UpdateBedDto,
  queryRoomsSchema,
  type QueryRoomsDto,
} from './dto/room.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
  CurrentUserId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Rooms & Beds')
@Controller()
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post('properties/:propertyId/rooms')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a room within a property' })
  @ApiResponse({ status: 201, description: 'Room created' })
  async createRoom(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Body(new ZodValidationPipe(createRoomSchema)) dto: CreateRoomDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.create(propertyId, dto, orgId, userId);
  }

  @Get('properties/:propertyId/rooms')
  @ApiOperation({ summary: 'List all rooms in a property with beds' })
  @ApiResponse({ status: 200, description: 'List of rooms' })
  async findRooms(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.roomsService.findAll(propertyId, orgId);
  }

  @Get('properties/:propertyId/rooms-page')
  @ApiOperation({ summary: 'Search and page rooms in a property' })
  async findRoomsPage(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @Query(new ZodValidationPipe(queryRoomsSchema)) query: QueryRoomsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.roomsService.findAll(propertyId, orgId, query);
  }

  @Get('rooms/:id')
  @ApiOperation({ summary: 'Get room details' })
  @ApiResponse({ status: 200, description: 'Room details' })
  async findOneRoom(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.roomsService.findById(id, orgId);
  }

  @Patch('rooms/:id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update room details' })
  @ApiResponse({ status: 200, description: 'Room updated' })
  async updateRoom(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateRoomSchema)) dto: UpdateRoomDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.update(id, dto, orgId, userId);
  }

  @Get('properties/:propertyId/inventory-stats')
  @ApiOperation({
    summary: 'Get comprehensive 17-point inventory statistics for a property',
  })
  @ApiResponse({ status: 200, description: 'Inventory statistics' })
  async getInventoryStats(
    @Param('propertyId', new ParseUUIDPipe()) propertyId: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.roomsService.getInventoryStats(propertyId, orgId);
  }

  @Patch('rooms/:id/toggle-disable-rent')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Toggle disable/enable room for rent' })
  @ApiResponse({ status: 200, description: 'Room rent availability toggled' })
  async toggleDisableRent(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.toggleDisableRent(id, orgId, userId);
  }

  @Patch('rooms/:id/toggle-publish')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Toggle room publication status' })
  @ApiResponse({ status: 200, description: 'Room publication toggled' })
  async togglePublish(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.togglePublish(id, orgId, userId);
  }

  @Delete('rooms/:id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Archive a room' })
  @ApiResponse({ status: 200, description: 'Room archived' })
  async archiveRoom(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.archive(id, orgId, userId);
  }

  // ── Bed Endpoints ──────────────────────────────────────────

  @Post('rooms/:roomId/beds')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a bed to a room' })
  @ApiResponse({ status: 201, description: 'Bed created' })
  async addBed(
    @Param('roomId', new ParseUUIDPipe()) roomId: string,
    @Body(new ZodValidationPipe(createBedSchema)) dto: CreateBedDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.addBed(roomId, dto, orgId, userId);
  }

  @Patch('beds/:id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update bed details or rent override' })
  @ApiResponse({ status: 200, description: 'Bed updated' })
  async updateBed(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateBedSchema)) dto: UpdateBedDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.updateBed(id, dto, orgId, userId);
  }

  @Delete('beds/:id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Archive a bed' })
  @ApiResponse({ status: 200, description: 'Bed archived' })
  async archiveBed(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.roomsService.archiveBed(id, orgId, userId);
  }
}
