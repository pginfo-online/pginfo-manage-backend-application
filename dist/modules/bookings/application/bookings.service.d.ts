import { PrismaService } from '../../../platform/database/index.js';
import type { CreateBookingDto, QueryBookingsDto } from '../api/dto/booking.dto.js';
export declare class BookingsService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(dto: CreateBookingDto, orgId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        bedId: string | null;
        notes: string | null;
        guestName: string;
        guestMobile: string;
        guestEmail: string | null;
        tokenAmount: number;
        expectedMoveIn: Date;
        expiryDate: Date | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        paymentRef: string | null;
    }>;
    findAll(orgId: string, query: QueryBookingsDto): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
        property: {
            id: string;
            name: string;
            city: string;
        };
        bed: {
            id: string;
            status: import("@prisma/client").$Enums.BedStatus;
            bedNumber: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        bedId: string | null;
        notes: string | null;
        guestName: string;
        guestMobile: string;
        guestEmail: string | null;
        tokenAmount: number;
        expectedMoveIn: Date;
        expiryDate: Date | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        paymentRef: string | null;
    }>>;
    findById(id: string, orgId: string): Promise<{
        property: {
            id: string;
            name: string;
            city: string;
        };
        bed: {
            id: string;
            status: import("@prisma/client").$Enums.BedStatus;
            bedNumber: string;
        } | null;
    } & {
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        bedId: string | null;
        notes: string | null;
        guestName: string;
        guestMobile: string;
        guestEmail: string | null;
        tokenAmount: number;
        expectedMoveIn: Date;
        expiryDate: Date | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        paymentRef: string | null;
    }>;
    cancel(id: string, orgId: string): Promise<{
        id: string;
        status: import("@prisma/client").$Enums.BookingStatus;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        propertyId: string;
        roomId: string | null;
        bedId: string | null;
        notes: string | null;
        guestName: string;
        guestMobile: string;
        guestEmail: string | null;
        tokenAmount: number;
        expectedMoveIn: Date;
        expiryDate: Date | null;
        paymentMode: import("@prisma/client").$Enums.PaymentMode;
        paymentRef: string | null;
    }>;
}
