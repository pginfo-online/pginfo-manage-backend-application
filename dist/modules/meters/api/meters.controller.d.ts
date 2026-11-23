import { MetersService } from '../application/meters.service.js';
import { type CreateSubMeterDto, type RecordReadingDto, type QueryMetersDto } from './dto/meter.dto.js';
export declare class MetersController {
    private readonly metersService;
    constructor(metersService: MetersService);
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
        initialReading: import("@prisma/client/runtime/library").Decimal;
        currentReading: import("@prisma/client/runtime/library").Decimal;
    }>;
    findAll(query: QueryMetersDto, orgId: string): Promise<({
        readings: {
            id: string;
            createdAt: Date;
            totalAmount: number;
            recordedBy: string | null;
            reading: import("@prisma/client/runtime/library").Decimal;
            readingDate: Date;
            photoUrl: string | null;
            unitsConsumed: import("@prisma/client/runtime/library").Decimal;
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
        initialReading: import("@prisma/client/runtime/library").Decimal;
        currentReading: import("@prisma/client/runtime/library").Decimal;
    })[]>;
    findOne(id: string, orgId: string): Promise<{
        readings: {
            id: string;
            createdAt: Date;
            totalAmount: number;
            recordedBy: string | null;
            reading: import("@prisma/client/runtime/library").Decimal;
            readingDate: Date;
            photoUrl: string | null;
            unitsConsumed: import("@prisma/client/runtime/library").Decimal;
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
        initialReading: import("@prisma/client/runtime/library").Decimal;
        currentReading: import("@prisma/client/runtime/library").Decimal;
    }>;
    recordReading(id: string, dto: RecordReadingDto, orgId: string, userId?: string): Promise<{
        id: string;
        createdAt: Date;
        totalAmount: number;
        recordedBy: string | null;
        reading: import("@prisma/client/runtime/library").Decimal;
        readingDate: Date;
        photoUrl: string | null;
        unitsConsumed: import("@prisma/client/runtime/library").Decimal;
        subMeterId: string;
    }>;
    getReadings(id: string, orgId: string): Promise<{
        id: string;
        createdAt: Date;
        totalAmount: number;
        recordedBy: string | null;
        reading: import("@prisma/client/runtime/library").Decimal;
        readingDate: Date;
        photoUrl: string | null;
        unitsConsumed: import("@prisma/client/runtime/library").Decimal;
        subMeterId: string;
    }[]>;
}
