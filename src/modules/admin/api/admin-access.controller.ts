import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import { AdminAccessService } from '../application/admin-access.service.js';
import { AdminQueryService } from '../application/admin-query.service.js';
import {
  adminListQuerySchema,
  adminUsersQuerySchema,
  createPlatformAdminSchema,
  updatePlatformAdminSchema,
  updateUserStatusSchema,
  type AdminListQueryDto,
  type AdminUsersQueryDto,
  type CreatePlatformAdminDto,
  type UpdatePlatformAdminDto,
  type UpdateUserStatusDto,
} from './dto/admin.dto.js';
import { adminRequestMetadata } from './admin-request.js';

@ApiTags('Platform Admin: Access and Users')
@ApiBearerAuth('JWT')
@Controller('admin')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class AdminAccessController {
  constructor(
    private readonly access: AdminAccessService,
    private readonly queryService: AdminQueryService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current platform admin and permissions' })
  me(@CurrentPlatformAdmin() actor: PlatformAdminContext) {
    return this.access.me(actor);
  }

  @Get('admins')
  @RequirePlatformPermissions('admins.manage')
  listAdmins(
    @Query(new ZodValidationPipe(adminListQuerySchema))
    query: AdminListQueryDto,
  ) {
    return this.access.list(query);
  }

  @Post('admins')
  @RequirePlatformPermissions('admins.manage')
  createAdmin(
    @Body(new ZodValidationPipe(createPlatformAdminSchema))
    dto: CreatePlatformAdminDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.access.create(dto, actor, adminRequestMetadata(request));
  }

  @Patch('admins/:id')
  @RequirePlatformPermissions('admins.manage')
  updateAdmin(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePlatformAdminSchema))
    dto: UpdatePlatformAdminDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.access.update(id, dto, actor, adminRequestMetadata(request));
  }

  @Get('users')
  @RequirePlatformPermissions('users.read')
  users(
    @Query(new ZodValidationPipe(adminUsersQuerySchema))
    query: AdminUsersQueryDto,
  ) {
    return this.queryService.users(query);
  }

  @Get('users/:id')
  @RequirePlatformPermissions('users.read')
  user(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.queryService.user(id);
  }

  @Patch('users/:id/status')
  @RequirePlatformPermissions('users.write')
  updateUserStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateUserStatusSchema))
    dto: UpdateUserStatusDto,
    @CurrentPlatformAdmin() actor: PlatformAdminContext,
    @Req() request: Request,
  ) {
    return this.access.updateUserStatus(
      id,
      dto,
      actor,
      adminRequestMetadata(request),
    );
  }
}
