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
import { AnnouncementsService } from '../application/announcements.service.js';
import {
  createAnnouncementSchema,
  sendRentReminderSchema,
  queryAnnouncementsSchema,
  type CreateAnnouncementDto,
  type SendRentReminderDto,
  type QueryAnnouncementsDto,
} from './dto/announcement.dto.js';
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

@ApiTags('Communications & Announcements')
@Controller('announcements')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create an announcement notice' })
  @ApiResponse({ status: 201, description: 'Announcement created' })
  async create(
    @Body(new ZodValidationPipe(createAnnouncementSchema))
    dto: CreateAnnouncementDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.announcementsService.create(dto, orgId, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List announcements with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated announcements' })
  async findAll(
    @Query(new ZodValidationPipe(queryAnnouncementsSchema))
    query: QueryAnnouncementsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.announcementsService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of an announcement' })
  @ApiResponse({ status: 200, description: 'Announcement details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.announcementsService.findById(id, orgId);
  }

  @Post(':id/send')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Dispatch announcement via WhatsApp and Email to active residents in scope',
  })
  @ApiResponse({ status: 200, description: 'Announcement dispatched' })
  async send(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.announcementsService.send(id, orgId, userId);
  }

  @Post('reminders/rent')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({
    summary:
      'Send automated rent reminders via WhatsApp and Email to residents with pending balances',
  })
  @ApiResponse({ status: 200, description: 'Reminders dispatched' })
  async sendRentReminders(
    @Body(new ZodValidationPipe(sendRentReminderSchema))
    dto: SendRentReminderDto,
    @CurrentOrgId() orgId: string,
    @CurrentUserId() userId: string,
  ) {
    return this.announcementsService.sendRentReminders(dto, orgId, userId);
  }
}
