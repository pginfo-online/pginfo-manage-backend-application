import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import type { CreateBookingDto, QueryBookingsDto } from '../api/dto/booking.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBookingDto, orgId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, organizationId: orgId },
    });

    if (!property) {
      throw new NotFoundError('Property', dto.propertyId);
    }

    if (dto.bedId) {
      const bed = await this.prisma.bed.findFirst({
        where: { id: dto.bedId, organizationId: orgId },
      });

      if (!bed) {
        throw new NotFoundError('Bed', dto.bedId);
      }

      if (bed.status !== 'AVAILABLE') {
        throw new ConflictError(`Bed ${bed.bedNumber} is not available for booking`);
      }
    }

    // Atomic transaction: create booking and reserve bed
    const booking = await this.prisma.$transaction(async (tx) => {
      const created = await tx.booking.create({
        data: {
          organizationId: orgId,
          propertyId: dto.propertyId,
          roomId: dto.roomId,
          bedId: dto.bedId,
          guestName: dto.guestName,
          guestMobile: dto.guestMobile,
          guestEmail: dto.guestEmail,
          tokenAmount: dto.tokenAmount,
          expectedMoveIn: dto.expectedMoveIn,
          expiryDate: dto.expiryDate,
          notes: dto.notes,
          paymentMode: dto.paymentMode,
          paymentRef: dto.paymentRef,
        },
      });

      if (dto.bedId) {
        await tx.bed.update({
          where: { id: dto.bedId },
          data: { status: 'RESERVED' },
        });
      }

      return created;
    });

    this.logger.log(`Created booking ${booking.id} for guest ${booking.guestName}`);
    return booking;
  }

  async findAll(orgId: string, query: QueryBookingsDto) {
    const { propertyId, status, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      organizationId: orgId,
      ...(propertyId ? { propertyId } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { guestName: { contains: search, mode: 'insensitive' } },
              { guestMobile: { contains: search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bed: { select: { id: true, bedNumber: true, status: true } },
          property: { select: { id: true, name: true, city: true } },
        },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return buildOffsetResponse(items, total, page, limit);
  }

  async findById(id: string, orgId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id, organizationId: orgId },
      include: {
        bed: { select: { id: true, bedNumber: true, status: true } },
        property: { select: { id: true, name: true, city: true } },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking', id);
    }

    return booking;
  }

  async cancel(id: string, orgId: string) {
    const booking = await this.findById(id, orgId);

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (booking.bedId) {
        await tx.bed.update({
          where: { id: booking.bedId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updated;
    });
  }
}
