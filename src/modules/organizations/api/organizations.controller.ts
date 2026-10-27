import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
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
import { OrganizationsService } from '../application/organizations.service.js';
import {
  createOrganizationSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  type CreateOrganizationDto,
  type AddMemberDto,
  type UpdateMemberRoleDto,
} from './dto/organization.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentUserId,
} from '../../../platform/authentication/index.js';

@ApiTags('Organizations')
@Controller('organizations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT')
export class OrganizationsController {
  constructor(private readonly orgService: OrganizationsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new property management organization' })
  @ApiResponse({
    status: 201,
    description: 'Organization created successfully',
  })
  async create(
    @Body(new ZodValidationPipe(createOrganizationSchema))
    dto: CreateOrganizationDto,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all organizations the user belongs to' })
  @ApiResponse({ status: 200, description: 'List of organizations' })
  async findAll(@CurrentUserId() userId: string) {
    return this.orgService.findAllForUser(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific organization' })
  @ApiResponse({ status: 200, description: 'Organization details' })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.findById(id, userId);
  }

  @Post(':id/switch')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Switch active organization context and receive a scoped JWT access token',
  })
  @ApiResponse({ status: 200, description: 'Context switched with new JWT' })
  @ApiResponse({ status: 403, description: 'User does not belong to this org' })
  async switchOrg(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.switchOrganization(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'List all members of an organization' })
  @ApiResponse({ status: 200, description: 'List of members' })
  async getMembers(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.getMembers(id, userId);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a registered user to the organization' })
  @ApiResponse({ status: 201, description: 'Member added' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  async addMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(addMemberSchema)) dto: AddMemberDto,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.addMember(id, dto, userId);
  }

  @Patch(':id/members/:memberId')
  @ApiOperation({ summary: "Update an organization member's role" })
  @ApiResponse({ status: 200, description: 'Role updated' })
  async updateMemberRole(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @Body(new ZodValidationPipe(updateMemberRoleSchema))
    dto: UpdateMemberRoleDto,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.updateMemberRole(id, memberId, dto, userId);
  }

  @Delete(':id/members/:memberId')
  @ApiOperation({ summary: 'Remove a member from the organization' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  async removeMember(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('memberId', new ParseUUIDPipe()) memberId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.orgService.removeMember(id, memberId, userId);
  }
}
