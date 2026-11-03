import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../../platform/authentication/index.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  CurrentPlatformAdmin,
  PlatformAdminGuard,
  RequirePlatformPermissions,
} from '../authorization/admin-authorization.js';
import type { PlatformAdminContext } from '../domain/admin-permissions.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import { AdminCommandService } from '../application/admin-command.service.js';
import {
  adminAnnouncementsQuerySchema,
  adminBookingsQuerySchema,
  adminComplaintsQuerySchema,
  adminInventoryQuerySchema,
  adminOrganizationsQuerySchema,
  adminPropertiesQuerySchema,
  adminResidentsQuerySchema,
  updateBedStatusSchema,
  updateOrganizationStatusSchema,
  updatePropertyStatusSchema,
  updateRoomStatusSchema,
  type AdminAnnouncementsQueryDto,
  type AdminBookingsQueryDto,
  type AdminComplaintsQueryDto,
  type AdminInventoryQueryDto,
  type AdminOrganizationsQueryDto,
  type AdminPropertiesQueryDto,
  type AdminResidentsQueryDto,
  type UpdateBedStatusDto,
  type UpdateOrganizationStatusDto,
  type UpdatePropertyStatusDto,
  type UpdateRoomStatusDto,
} from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';

@ApiTags('Platform Admin: Property Operations')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminPlatformController {
  constructor(
    private readonly queryService: AdminQueryService,
    private readonly commands: AdminCommandService,
  ) {}

  @Get('organizations')
  @RequirePlatformPermissions('organizations.read')
  organizations(
    @Query(new ZodValidationPipe(adminOrganizationsQuerySchema))
    query: AdminOrganizationsQueryDto,
  ) {
    return this.queryService.organizations(query);
  }

  @Get('organizations/:id')
  @RequirePlatformPermissions('organizations.read')
  organization(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryService.organization(id);
  }

  @Patch('organizations/:id/status')
  @RequirePlatformPermissions('organizations.write')
  updateOrganizationStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateOrganizationStatusSchema))
    dto: UpdateOrganizationStatusDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.commands.updateOrganizationStatus(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Get('properties')
  @RequirePlatformPermissions('properties.read')
  properties(
    @Query(new ZodValidationPipe(adminPropertiesQuerySchema))
    query: AdminPropertiesQueryDto,
  ) {
    return this.queryService.properties(query);
  }

  @Get('properties/:id')
  @RequirePlatformPermissions('properties.read')
  property(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryService.property(id);
  }

  @Patch('properties/:id/status')
  @RequirePlatformPermissions('properties.write')
  updatePropertyStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePropertyStatusSchema))
    dto: UpdatePropertyStatusDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.commands.updatePropertyStatus(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Get('rooms')
  @RequirePlatformPermissions('inventory.read')
  rooms(
    @Query(new ZodValidationPipe(adminInventoryQuerySchema))
    query: AdminInventoryQueryDto,
  ) {
    return this.queryService.rooms(query);
  }

  @Patch('rooms/:id/status')
  @RequirePlatformPermissions('inventory.write')
  updateRoomStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateRoomStatusSchema))
    dto: UpdateRoomStatusDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.commands.updateRoomStatus(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Get('beds')
  @RequirePlatformPermissions('inventory.read')
  beds(
    @Query(new ZodValidationPipe(adminInventoryQuerySchema))
    query: AdminInventoryQueryDto,
  ) {
    return this.queryService.beds(query);
  }

  @Patch('beds/:id/status')
  @RequirePlatformPermissions('inventory.write')
  updateBedStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateBedStatusSchema)) dto: UpdateBedStatusDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.commands.updateBedStatus(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }

  @Get('residents')
  @RequirePlatformPermissions('residents.read')
  residents(
    @Query(new ZodValidationPipe(adminResidentsQuerySchema))
    query: AdminResidentsQueryDto,
  ) {
    return this.queryService.residents(query);
  }

  @Get('bookings')
  @RequirePlatformPermissions('bookings.read')
  bookings(
    @Query(new ZodValidationPipe(adminBookingsQuerySchema))
    query: AdminBookingsQueryDto,
  ) {
    return this.queryService.bookings(query);
  }

  @Get('complaints')
  @RequirePlatformPermissions('support.read')
  complaints(
    @Query(new ZodValidationPipe(adminComplaintsQuerySchema))
    query: AdminComplaintsQueryDto,
  ) {
    return this.queryService.complaints(query);
  }

  @Get('complaints/:id')
  @RequirePlatformPermissions('support.read')
  complaint(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryService.complaint(id);
  }

  @Get('announcements')
  @RequirePlatformPermissions('support.read')
  @ApiOperation({ summary: 'Monitor organization and property announcements' })
  announcements(
    @Query(new ZodValidationPipe(adminAnnouncementsQuerySchema))
    query: AdminAnnouncementsQueryDto,
  ) {
    return this.queryService.announcements(query);
  }
}
