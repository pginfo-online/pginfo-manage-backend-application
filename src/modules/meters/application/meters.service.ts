import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError } from '../../../common/errors/index.js';
import type {
  CreateSubMeterDto,
  RecordReadingDto,
  QueryMetersDto,
} from '../api/dto/meter.dto.js';
import { Prisma } from '@prisma/client';

@Injectable()
export class MetersService {
  private readonly logger = new Logger(MetersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSubMeterDto, orgId: string) {
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
      throw new BadRequestException(
        `Meter number "${dto.meterNumber}" already exists in this property`,
      );
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

  async findAll(orgId: string, query: QueryMetersDto) {
    const where: Prisma.SubMeterWhereInput = {
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

  async findById(id: string, orgId: string) {
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

  async recordReading(
    id: string,
    dto: RecordReadingDto,
    orgId: string,
    userId?: string,
  ) {
    const meter = await this.prisma.subMeter.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!meter) {
      throw new NotFoundError('SubMeter', id);
    }

    const currentReadingVal = Number(meter.currentReading);
    if (dto.reading < currentReadingVal) {
      throw new BadRequestException(
        `New reading (${dto.reading}) cannot be less than current reading (${currentReadingVal})`,
      );
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

      this.logger.log(
        `Recorded reading for meter ${meter.meterNumber}: ${unitsConsumed} units, amount: ${totalAmount} paise`,
      );

      return reading;
    });
  }

  async getReadings(id: string, orgId: string) {
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
}
