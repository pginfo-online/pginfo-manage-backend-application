import { BookingsService } from '../application/bookings.service.js';
import { type CreateBookingDto, type QueryBookingsDto } from './dto/booking.dto.js';
export declare class BookingsController {
    private readonly bookingsService;
    constructor(bookingsService: BookingsService);
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
    findAll(query: QueryBookingsDto, orgId: string): Promise<import("../../../common/pagination/index.js").PaginatedResponse<{
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
    findOne(id: string, orgId: string): Promise<{
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
