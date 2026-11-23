var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var MetersService_1;
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import { Prisma } from '@prisma/client';
let MetersService = MetersService_1 = class MetersService {
    prisma;
    logger = new Logger(MetersService_1.name);
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
        if (dto.roomId) {
            const room = await this.prisma.room.findFirst({
                where: { id: dto.roomId, propertyId: dto.propertyId },
            });
            if (!room) {
                throw new NotFoundError('Room', dto.roomId);
            }
        }
        const existing = await this.prisma.subMeter.findFirst({
            where: {
                propertyId: dto.propertyId,
                meterNumber: dto.meterNumber,
            },
        });
        if (existing) {
            throw new BadRequestException(`Meter number "${dto.meterNumber}" already exists in this property`);
        }
        return this.prisma.subMeter.create({
            data: {
                organizationId: orgId,
                propertyId: dto.propertyId,
                roomId: dto.roomId,
                meterNumber: dto.meterNumber,
                tariffRate: dto.tariffRate,
                initialReading: new Prisma.Decimal(dto.initialReading),
                currentReading: new Prisma.Decimal(dto.initialReading),
            },
        });
    }
    async findAll(orgId, query) {
        const where = {
            organizationId: orgId,
            ...(query.propertyId ? { propertyId: query.propertyId } : {}),
            ...(query.roomId ? { roomId: query.roomId } : {}),
            ...(query.isActive !== undefined ? { isActive: query.isActive } : {}),
        };
        return this.prisma.subMeter.findMany({
            where,
            include: {
                readings: {
                    orderBy: { readingDate: 'desc' },
                    take: 5,
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findById(id, orgId) {
        const meter = await this.prisma.subMeter.findFirst({
            where: { id, organizationId: orgId },
            include: {
                readings: {
                    orderBy: { readingDate: 'desc' },
                },
            },
        });
        if (!meter) {
            throw new NotFoundError('SubMeter', id);
        }
        return meter;
    }
    async recordReading(id, dto, orgId, userId) {
        const meter = await this.prisma.subMeter.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!meter) {
            throw new NotFoundError('SubMeter', id);
        }
        const currentReadingVal = Number(meter.currentReading);
        if (dto.reading < currentReadingVal) {
            throw new BadRequestException(`New reading (${dto.reading}) cannot be less than current reading (${currentReadingVal})`);
        }
        const unitsConsumed = dto.reading - currentReadingVal;
        const totalAmount = Math.round(unitsConsumed * meter.tariffRate);
        const readingDate = dto.readingDate
            ? new Date(dto.readingDate)
            : new Date();
        return this.prisma.$transaction(async (tx) => {
            const reading = await tx.meterReading.create({
                data: {
                    subMeterId: id,
                    readingDate,
                    reading: new Prisma.Decimal(dto.reading),
                    unitsConsumed: new Prisma.Decimal(unitsConsumed),
                    totalAmount,
                    recordedBy: userId,
                    photoUrl: dto.photoUrl,
                },
            });
            await tx.subMeter.update({
                where: { id },
                data: {
                    currentReading: new Prisma.Decimal(dto.reading),
                },
            });
            this.logger.log(`Recorded reading for meter ${meter.meterNumber}: ${unitsConsumed} units, amount: ${totalAmount} paise`);
            return reading;
        });
    }
    async getReadings(id, orgId) {
        const meter = await this.prisma.subMeter.findFirst({
            where: { id, organizationId: orgId },
        });
        if (!meter) {
            throw new NotFoundError('SubMeter', id);
        }
        return this.prisma.meterReading.findMany({
            where: { subMeterId: id },
            orderBy: { readingDate: 'desc' },
        });
    }
};
MetersService = MetersService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], MetersService);
export { MetersService };
//# sourceMappingURL=meters.service.js.map