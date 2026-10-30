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
import { BookingsService } from '../application/bookings.service.js';
import {
  createBookingSchema,
  queryBookingsSchema,
  type CreateBookingDto,
  type QueryBookingsDto,
} from './dto/booking.dto.js';
import { ZodValidationPipe } from '../../../common/validation/index.js';
import {
  JwtAuthGuard,
  CurrentOrgId,
} from '../../../platform/authentication/index.js';
import {
  RequireOrgGuard,
  RequireOrgRoles,
  OrgRolesGuard,
} from '../../../platform/authorization/index.js';

@ApiTags('Occupancy: Bookings & Holds')
@Controller('bookings')
@UseGuards(JwtAuthGuard, RequireOrgGuard, OrgRolesGuard)
@ApiBearerAuth('JWT')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create a room reservation / booking hold' })
  @ApiResponse({ status: 201, description: 'Booking created and bed reserved' })
  async create(
    @Body(new ZodValidationPipe(createBookingSchema)) dto: CreateBookingDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.bookingsService.create(dto, orgId);
  }

  @Get()
  @ApiOperation({ summary: 'List bookings with pagination' })
  @ApiResponse({ status: 200, description: 'Paginated list of bookings' })
  async findAll(
    @Query(new ZodValidationPipe(queryBookingsSchema)) query: QueryBookingsDto,
    @CurrentOrgId() orgId: string,
  ) {
    return this.bookingsService.findAll(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get details of a specific booking' })
  @ApiResponse({ status: 200, description: 'Booking details' })
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.bookingsService.findById(id, orgId);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @RequireOrgRoles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Cancel a booking and free the reserved bed' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancel(
    @Param('id', new ParseUUIDPipe()) id: string,
    @CurrentOrgId() orgId: string,
  ) {
    return this.bookingsService.cancel(id, orgId);
  }
}
