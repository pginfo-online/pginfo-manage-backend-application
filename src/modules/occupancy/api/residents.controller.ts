import {
  Controller,
  Post,
  Get,
  Patch,
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
import { ResidentsService } from '../application/residents.service.js';
import {
  createResidentSchema,
  noticeSchema,
  bulkMoveOutSchema,
  type NoticeDto,
  type BulkMoveOutDto,
  updateResidentSchema,
  reallocateResidentSchema,
  swapBedsSchema,
  moveOutSchema,
  queryResidentsSchema,
  type CreateResidentDto,
  type UpdateResidentDto,
  type ReallocateResidentDto,
  type SwapBedsDto,
  type MoveOutDto,
  type QueryResidentsDto,
} from './dto/resident.dto.js';
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

@ApiTags('Residents & Occupancy')
@Controller('residents')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class ResidentsController {
  constructor(private readonly residentsService: ResidentsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Onboard a new resident and allocate room/bed' })
  @ApiResponse({ status: 201, description: 'Resident onboarded' })
  @ApiResponse({ status: 409, description: 'Bed already occupied' })
  async create(
    @Body(new ZodValidationPipe(createResidentSchema)) dto: CreateResidentDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List residents with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated residents list' })
  async findAll(
    @Query(new ZodValidationPipe(queryResidentsSchema))
    query: QueryResidentsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.residentsService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Get resident profile, current room/bed, and financial balance summary',
  })
  @ApiResponse({ status: 200, description: 'Resident details' })
  @ApiResponse({ status: 404, description: 'Resident not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.residentsService.findById(id, orgId);
  }

  @Patch(':id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update resident personal or lease details' })
  @ApiResponse({ status: 200, description: 'Resident updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateResidentSchema)) dto: UpdateResidentDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.update(id, dto, orgId, userId);
  }

  @Post(':id/reallocate')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Reallocate resident to a different room or bed with full audit history',
  })
  @ApiResponse({ status: 200, description: 'Reallocation successful' })
  @ApiResponse({ status: 409, description: 'Target bed is occupied' })
  async reallocate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(reallocateResidentSchema))
    dto: ReallocateResidentDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.reallocate(id, dto, orgId, userId);
  }

  @Post('swap-beds')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Atomically swap room and bed allocations between two residents',
  })
  @ApiResponse({ status: 200, description: 'Beds swapped successfully' })
  async swapBeds(
    @Body(new ZodValidationPipe(swapBedsSchema)) dto: SwapBedsDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.swapBeds(dto, orgId, userId);
  }

  @Post(':id/notice')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  giveNotice(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(noticeSchema)) dto: NoticeDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.giveNotice(id, dto, orgId, userId);
  }

  @Post('bulk-move-out')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  bulkMoveOut(
    @Body(new ZodValidationPipe(bulkMoveOutSchema)) dto: BulkMoveOutDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.bulkMoveOut(dto, orgId, userId);
  }

  @Post(':id/move-out')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Process resident move-out and release their bed',
  })
  @ApiResponse({ status: 200, description: 'Move out processed' })
  async moveOut(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(moveOutSchema)) dto: MoveOutDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.residentsService.moveOut(id, dto, orgId, userId);
  }
}
