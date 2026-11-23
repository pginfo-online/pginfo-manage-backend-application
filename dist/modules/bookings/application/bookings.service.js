var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var BookingsService_1;
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
let BookingsService = BookingsService_1 = class BookingsService {
    prisma;
    logger = new Logger(BookingsService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, orgId) {
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
    async findAll(orgId, query) {
        const { propertyId, status, search, page, limit } = query;
        const skip = (page - 1) * limit;
        const where = {
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
    async findById(id, orgId) {
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
    async cancel(id, orgId) {
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
};
BookingsService = BookingsService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], BookingsService);
export { BookingsService };
//# sourceMappingURL=bookings.service.js.map