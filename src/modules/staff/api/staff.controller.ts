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
import { StaffService } from '../application/staff.service.js';
import {
  createStaffSchema,
  updateStaffSchema,
  createStaffDesignationSchema,
  queryStaffSchema,
  type CreateStaffDto,
  type UpdateStaffDto,
  type CreateStaffDesignationDto,
  type QueryStaffDto,
} from './dto/staff.dto.js';
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

@ApiTags('Staff')
@Controller('staff')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Add a new staff member' })
  @ApiResponse({ status: 201, description: 'Staff created' })
  async create(
    @Body(new ZodValidationPipe(createStaffSchema)) dto: CreateStaffDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.staffService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List staff members with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated staff list' })
  async findAll(
    @Query(new ZodValidationPipe(queryStaffSchema)) query: QueryStaffDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.staffService.findAll(orgId, query);
  }

  @Get('designations')
  @ApiOperation({ summary: 'List active staff designations' })
  @ApiResponse({ status: 200, description: 'Designations list' })
  async getDesignations(@CurrentOrgId() orgId: string) {
    return this.staffService.getDesignations(orgId);
  }

  @Post('designations')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Create a custom staff designation' })
  @ApiResponse({ status: 201, description: 'Designation created' })
  async createDesignation(
    @Body(new ZodValidationPipe(createStaffDesignationSchema))
    dto: CreateStaffDesignationDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.staffService.createDesignation(dto, orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a staff member' })
  @ApiResponse({ status: 200, description: 'Staff details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.staffService.findById(id, orgId);
  }

  @Patch(':id')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update a staff member' })
  @ApiResponse({ status: 200, description: 'Staff updated' })
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateStaffSchema)) dto: UpdateStaffDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.staffService.update(id, dto, orgId, userId);
  }

  @Delete(':id')
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Deactivate a staff member' })
  @ApiResponse({ status: 200, description: 'Staff deactivated' })
  async deactivate(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.staffService.deactivate(id, orgId, userId);
  }
}
