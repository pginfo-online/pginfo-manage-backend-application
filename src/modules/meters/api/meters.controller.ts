import {
  Controller,
  Post,
  Get,
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
import { MetersService } from '../application/meters.service.js';
import {
  createSubMeterSchema,
  recordReadingSchema,
  queryMetersSchema,
  type CreateSubMeterDto,
  type RecordReadingDto,
  type QueryMetersDto,
} from './dto/meter.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
  CurrentUser,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Property: Electric Sub-Meters')
@Controller('meters')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Register an electric sub-meter' })
  @ApiResponse({ status: 201, description: 'Sub-meter registered' })
  async create(
    @Body(new ZodValidationPipe(createSubMeterSchema)) dto: CreateSubMeterDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.metersService.create(dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List electric sub-meters' })
  @ApiResponse({ status: 200, description: 'List of sub-meters' })
  async findAll(
    @Query(new ZodValidationPipe(queryMetersSchema)) query: QueryMetersDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.metersService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details and reading history for a sub-meter' })
  @ApiResponse({ status: 200, description: 'Sub-meter details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.metersService.findById(id, orgId);
  }

  @Post(':id/readings')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Record a new meter reading' })
  @ApiResponse({ status: 201, description: 'Meter reading recorded' })
  async recordReading(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(recordReadingSchema)) dto: RecordReadingDto,
    @CurrentOrgId() orgId: string,
    @CurrentUser('id') userId?: string,
  ) {
    return this.metersService.recordReading(id, dto, orgId, userId);
  }

  @Get(':id/readings')
  @ApiOperation({ summary: 'Get reading logs for a sub-meter' })
  @ApiResponse({ status: 200, description: 'List of readings' })
  async getReadings(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.metersService.getReadings(id, orgId);
  }
}
