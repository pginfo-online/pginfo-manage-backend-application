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
import { ComplaintsService } from '../application/complaints.service.js';
import {
  createComplaintSchema,
  updateComplaintStatusSchema,
  assignComplaintSchema,
  addCommentSchema,
  createComplaintCategorySchema,
  queryComplaintsSchema,
  type CreateComplaintDto,
  type UpdateComplaintStatusDto,
  type AssignComplaintDto,
  type AddCommentDto,
  type CreateComplaintCategoryDto,
  type QueryComplaintsDto,
} from './dto/complaint.dto.js';
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

@ApiTags('Complaints & Maintenance')
@Controller('complaints')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class ComplaintsController {
  constructor(private readonly complaintsService: ComplaintsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Log a new complaint / maintenance request' })
  @ApiResponse({ status: 201, description: 'Complaint created' })
  async create(
    @Body(new ZodValidationPipe(createComplaintSchema)) dto: CreateComplaintDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List complaints with filters and pagination' })
  @ApiResponse({ status: 200, description: 'Paginated complaints' })
  async findAll(
    @Query(new ZodValidationPipe(queryComplaintsSchema))
    query: QueryComplaintsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.complaintsService.findAll(orgId, query);
  }

  @Get('categories')
  @ApiOperation({ summary: 'List active complaint categories' })
  @ApiResponse({ status: 200, description: 'Categories list' })
  async getCategories(@CurrentOrgId() orgId: string) {
    return this.complaintsService.getCategories(orgId);
  }

  @Post('categories')
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Add a custom complaint category' })
  @ApiResponse({ status: 201, description: 'Category created' })
  async createCategory(
    @Body(new ZodValidationPipe(createComplaintCategorySchema))
    dto: CreateComplaintCategoryDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.complaintsService.createCategory(dto, orgId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get complaint details with full comments and transition history',
  })
  @ApiResponse({ status: 200, description: 'Complaint details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.complaintsService.findById(id, orgId);
  }

  @Patch(':id/status')
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER', 'STAFF')
  @ApiOperation({
    summary: 'Transition complaint status with state machine verification',
  })
  @ApiResponse({ status: 200, description: 'Status updated' })
  async updateStatus(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateComplaintStatusSchema))
    dto: UpdateComplaintStatusDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.updateStatus(id, dto, orgId, userId);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Assign staff member to the complaint' })
  @ApiResponse({ status: 200, description: 'Staff assigned' })
  async assign(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(assignComplaintSchema)) dto: AssignComplaintDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.assign(id, dto, orgId, userId);
  }

  @Post(':id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a discussion comment to a complaint' })
  @ApiResponse({ status: 201, description: 'Comment added' })
  async addComment(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addCommentSchema)) dto: AddCommentDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.complaintsService.addComment(id, dto, orgId, userId);
  }
}
