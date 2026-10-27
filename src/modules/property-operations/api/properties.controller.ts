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
import { PropertiesService } from '../application/properties.service.js';
import {
  createPropertySchema,
  updatePropertySchema,
  queryPropertiesSchema,
  type CreatePropertyDto,
  type UpdatePropertyDto,
  type QueryPropertiesDto,
} from './dto/property.dto.js';
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

@ApiTags('Properties')
@Controller('properties')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary: 'Create a new property within current organization',
  })
  @ApiResponse({ status: 201, description: 'Property created' })
  async create(
    @Body(new ZodValidationPipe(createPropertySchema)) dto: CreatePropertyDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.propertiesService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List properties in current organization' })
  @ApiResponse({ status: 200, description: 'Paginated list of properties' })
  async findAll(
    @Query(new ZodValidationPipe(queryPropertiesSchema))
    query: QueryPropertiesDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.propertiesService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get property details with live statistics' })
  @ApiResponse({ status: 200, description: 'Property details' })
  @ApiResponse({ status: 404, description: 'Property not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.propertiesService.findById(id, orgId);
  }

  @Patch(':id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update property details' })
  @ApiResponse({ status: 200, description: 'Property updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updatePropertySchema)) dto: UpdatePropertyDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.propertiesService.update(id, dto, orgId, userId);
  }

  @Delete(':id')
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Archive a property (soft delete)' })
  @ApiResponse({ status: 200, description: 'Property archived' })
  async archive(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.propertiesService.archive(id, orgId, userId);
  }

  @Get(':id/occupancy-map')
  @ApiOperation({
    summary: 'Get full visual room & bed occupancy map with residents',
  })
  @ApiResponse({ status: 200, description: 'Floor/room/bed occupancy map' })
  async getOccupancyMap(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.propertiesService.getOccupancyMap(id, orgId);
  }
}
