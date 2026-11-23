import { PrismaService } from '../../../platform/database/index.js';
import type { CreateSubMeterDto, RecordReadingDto, QueryMetersDto } from '../api/dto/meter.dto.js';
import { Prisma } from '@prisma/client';
export declare class MetersService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(dto: CreateSubMeterDto, orgId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        meterNumber: string;
        tariffRate: number;
        initialReading: Prisma.Decimal;
        currentReading: Prisma.Decimal;
    }>;
    findAll(orgId: string, query: QueryMetersDto): Promise<({
        readings: {
            id: string;
            createdAt: Date;
            totalAmount: number;
            recordedBy: string | null;
            reading: Prisma.Decimal;
            readingDate: Date;
            photoUrl: string | null;
            unitsConsumed: Prisma.Decimal;
            subMeterId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        meterNumber: string;
        tariffRate: number;
        initialReading: Prisma.Decimal;
        currentReading: Prisma.Decimal;
    })[]>;
    findById(id: string, orgId: string): Promise<{
        readings: {
            id: string;
            createdAt: Date;
            totalAmount: number;
            recordedBy: string | null;
            reading: Prisma.Decimal;
            readingDate: Date;
            photoUrl: string | null;
            unitsConsumed: Prisma.Decimal;
            subMeterId: string;
        }[];
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        meterNumber: string;
        tariffRate: number;
        initialReading: Prisma.Decimal;
        currentReading: Prisma.Decimal;
    }>;
    recordReading(id: string, dto: RecordReadingDto, orgId: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        totalAmount: number;
        recordedBy: string | null;
        reading: Prisma.Decimal;
        readingDate: Date;
        photoUrl: string | null;
        unitsConsumed: Prisma.Decimal;
        subMeterId: string;
    }>;
    getReadings(id: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        totalAmount: number;
        recordedBy: string | null;
        reading: Prisma.Decimal;
        readingDate: Date;
        photoUrl: string | null;
        unitsConsumed: Prisma.Decimal;
        subMeterId: string;
    }[]>;
}
