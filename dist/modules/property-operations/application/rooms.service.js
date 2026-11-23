var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var RoomsService_1;
import { Injectable, Logger, Inject, Optional } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { NotFoundError, ConflictError } from '../../../common/errors/index.js';
import { buildOffsetResponse } from '../../../common/pagination/index.js';
import { REDIS_CLIENT } from '../../../platform/cache/index.js';
let RoomsService = RoomsService_1 = class RoomsService {
    prisma;
    redis;
    logger = new Logger(RoomsService_1.name);
    constructor(prisma, redis) {
        this.prisma = prisma;
        this.redis = redis;
    }
    async getCached(key) {
        if (!this.redis)
            return null;
        try {
            const data = await this.redis.get(key);
            return data ? JSON.parse(data) : null;
        }
        catch {
            return null;
        }
    }
    async setCached(key, data, ttlSeconds = 180) {
        if (!this.redis)
            return;
        try {
            await this.redis.set(key, JSON.stringify(data), 'EX', ttlSeconds);
        }
        catch (err) {
            this.logger.warn(`Redis set error for ${key}: ${err.message}`);
        }
    }
    async invalidateRoomCache(propertyId) {
        if (!this.redis)
            return;
        try {
            const keys = await this.redis.keys(`property:rooms:${propertyId}:*`);
            if (keys.length > 0) {
                await this.redis.del(...keys);
            }
            const statKeys = await this.redis.keys(`property:stats:${propertyId}*`);
            if (statKeys.length > 0) {
                await this.redis.del(...statKeys);
            }
            const orgKeys = await this.redis.keys(`org:properties:*`);
            if (orgKeys.length > 0) {
                await this.redis.del(...orgKeys);
            }
        }
        catch (err) {
            this.logger.warn(`Redis invalidation error: ${err.message}`);
        }
    }
    logAudit(data) {
        if (this.prisma.auditLog?.create) {
            void Promise.resolve(this.prisma.auditLog.create({ data })).catch((err) => this.logger.warn(`Failed to write audit log: ${err?.message ?? err}`));
        }
    }
    async create(propertyId, dto, orgId, userId) {
        const [property, existing] = await Promise.all([
            this.prisma.property.findFirst({
                where: { id: propertyId, organizationId: orgId },
                select: { id: true },
            }),
            this.prisma.room.findUnique({
                where: {
                    propertyId_roomNumber: { propertyId, roomNumber: dto.roomNumber },
                },
                select: { id: true },
            }),
        ]);
        if (!property) {
            throw new NotFoundError('Property', propertyId);
        }
        if (existing) {
            throw new ConflictError(`Room '${dto.roomNumber}' already exists in this property`);
        }
        const bedNames = dto.bedNames && dto.bedNames.length > 0
            ? dto.bedNames
            : dto.initialBedCount && dto.initialBedCount > 0
                ? Array.from({ length: dto.initialBedCount }, (_, i) => {
                    const bedLetters = [
                        'A',
                        'B',
                        'C',
                        'D',
                        'E',
                        'F',
                        'G',
                        'H',
                        'I',
                        'J',
                        'K',
                        'L',
                    ];
                    return `Bed${bedLetters[i] ?? `${i + 1}`}`;
                })
                : [];
        const bedsData = bedNames.map((name) => ({
            organizationId: orgId,
            bedNumber: name,
            status: 'AVAILABLE',
            rentAmount: dto.bedRents && dto.bedRents[name] ? dto.bedRents[name] : null,
        }));
        const room = await this.prisma.room.create({
            data: {
                propertyId,
                organizationId: orgId,
                roomNumber: dto.roomNumber,
                floor: dto.floor,
                sharingType: dto.sharingType,
                rentAmount: dto.rentAmount,
                amenities: dto.amenities,
                description: dto.description,
                unitType: dto.unitType || 'Room',
                gender: dto.gender || 'UNISEX',
                remarks: dto.remarks,
                lockInPeriod: dto.lockInPeriod || 'No Lock-in',
                dailyStayMinPaise: dto.dailyStayMinPaise,
                dailyStayMaxPaise: dto.dailyStayMaxPaise,
                areaSqft: dto.areaSqft,
                isDisabledForRent: dto.isDisabledForRent ?? false,
                isPublished: dto.isPublished ?? true,
                images: dto.images ?? [],
                isVerified: dto.isVerified ?? true,
                availableFrom: dto.availableFrom,
                beds: bedsData.length > 0 ? { create: bedsData } : undefined,
            },
            include: {
                beds: {
                    where: { status: { not: 'ARCHIVED' } },
                    select: { id: true, bedNumber: true, status: true, rentAmount: true },
                    orderBy: { bedNumber: 'asc' },
                },
            },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: 'room.create',
            entityType: 'Room',
            entityId: room.id,
        });
        await this.invalidateRoomCache(propertyId);
        return room;
    }
    async findAll(propertyId, orgId, query) {
        const cacheKey = `property:rooms:${propertyId}:${JSON.stringify(query || {})}`;
        const cached = await this.getCached(cacheKey);
        if (cached) {
            return cached;
        }
        const where = {
            propertyId,
            organizationId: orgId,
            status: query?.status ?? { not: 'ARCHIVED' },
            ...(query?.sharingType ? { sharingType: query.sharingType } : {}),
            ...(query?.gender ? { gender: query.gender } : {}),
            ...(query?.floor ? { floor: query.floor } : {}),
            ...(query?.unitType ? { unitType: query.unitType } : {}),
            ...(query?.published ? { isPublished: query.published === 'true' } : {}),
            ...(query?.search
                ? { roomNumber: { contains: query.search, mode: 'insensitive' } }
                : {}),
            ...(query?.vacancy === 'VACANT'
                ? { beds: { some: { status: 'AVAILABLE' } } }
                : query?.vacancy === 'FULL'
                    ? {
                        AND: [
                            { beds: { some: {} } },
                            { beds: { none: { status: 'AVAILABLE' } } },
                        ],
                    }
                    : {}),
        };
        const [rooms, total] = await Promise.all([
            this.prisma.room.findMany({
                where,
                ...(query
                    ? { skip: (query.page - 1) * query.limit, take: query.limit }
                    : {}),
                include: {
                    beds: {
                        where: { status: { not: 'ARCHIVED' } },
                        select: { id: true, bedNumber: true, status: true },
                        orderBy: { bedNumber: 'asc' },
                    },
                },
                orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
            }),
            this.prisma.room.count({ where }),
        ]);
        const result = query
            ? buildOffsetResponse(rooms, total, query.page, query.limit)
            : rooms;
        await this.setCached(cacheKey, result, 180);
        return result;
    }
    async findById(id, orgId) {
        const room = await this.prisma.room.findFirst({
            where: { id, organizationId: orgId },
            include: {
                property: {
                    select: {
                        id: true,
                        name: true,
                        type: true,
                        timezone: true,
                    },
                },
                beds: {
                    where: { status: { not: 'ARCHIVED' } },
                    include: {
                        residents: {
                            where: {
                                status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
                            },
                            select: {
                                id: true,
                                firstName: true,
                                lastName: true,
                                mobile: true,
                                status: true,
                                monthlyRent: true,
                                joiningDate: true,
                            },
                        },
                        bookings: {
                            where: { status: { in: ['CONFIRMED'] } },
                            select: {
                                id: true,
                                guestName: true,
                                guestMobile: true,
                                expectedMoveIn: true,
                                status: true,
                            },
                        },
                    },
                    orderBy: { bedNumber: 'asc' },
                },
            },
        });
        if (!room) {
            throw new NotFoundError('Room', id);
        }
        return room;
    }
    async update(id, dto, orgId, userId) {
        const room = await this.prisma.room.findFirst({
            where: { id, organizationId: orgId },
            select: { id: true, propertyId: true, roomNumber: true },
        });
        if (!room) {
            throw new NotFoundError('Room', id);
        }
        if (dto.roomNumber && dto.roomNumber !== room.roomNumber) {
            const existing = await this.prisma.room.findUnique({
                where: {
                    propertyId_roomNumber: {
                        propertyId: room.propertyId,
                        roomNumber: dto.roomNumber,
                    },
                },
                select: { id: true },
            });
            if (existing) {
                throw new ConflictError(`Room '${dto.roomNumber}' already exists in this property`);
            }
        }
        const updated = await this.prisma.room.update({
            where: { id },
            data: dto,
            include: {
                beds: {
                    where: { status: { not: 'ARCHIVED' } },
                    select: { id: true, bedNumber: true, status: true },
                    orderBy: { bedNumber: 'asc' },
                },
            },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: 'room.update',
            entityType: 'Room',
            entityId: id,
        });
        await this.invalidateRoomCache(room.propertyId);
        return updated;
    }
    async archive(id, orgId, userId) {
        const [room, activeResidents] = await Promise.all([
            this.prisma.room.findFirst({
                where: { id, organizationId: orgId },
                select: { id: true, propertyId: true },
            }),
            this.prisma.resident.count({
                where: {
                    roomId: id,
                    status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
                },
            }),
        ]);
        if (!room) {
            throw new NotFoundError('Room', id);
        }
        if (activeResidents > 0) {
            throw new ConflictError(`Cannot archive room with ${activeResidents} active residents. Reallocate them first.`);
        }
        await this.prisma.room.update({
            where: { id },
            data: { status: 'ARCHIVED' },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: 'room.archive',
            entityType: 'Room',
            entityId: id,
        });
        await this.invalidateRoomCache(room.propertyId);
        return { success: true, message: 'Room archived successfully' };
    }
    async addBed(roomId, dto, orgId, userId) {
        const room = await this.prisma.room.findFirst({
            where: { id: roomId, organizationId: orgId },
            select: { id: true, roomNumber: true, propertyId: true },
        });
        if (!room) {
            throw new NotFoundError('Room', roomId);
        }
        const existing = await this.prisma.bed.findUnique({
            where: {
                roomId_bedNumber: {
                    roomId,
                    bedNumber: dto.bedNumber,
                },
            },
            select: { id: true },
        });
        if (existing) {
            throw new ConflictError(`Bed '${dto.bedNumber}' already exists in room '${room.roomNumber}'`);
        }
        const bed = await this.prisma.bed.create({
            data: {
                roomId,
                organizationId: orgId,
                bedNumber: dto.bedNumber,
                rentAmount: dto.rentAmount,
                isDisabledForRent: dto.isDisabledForRent ?? false,
                remarks: dto.remarks,
            },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: 'bed.create',
            entityType: 'Bed',
            entityId: bed.id,
        });
        await this.invalidateRoomCache(room.propertyId);
        return bed;
    }
    async updateBed(bedId, dto, orgId, userId) {
        const bed = await this.prisma.bed.findFirst({
            where: { id: bedId, organizationId: orgId },
            include: { room: { select: { id: true, propertyId: true } } },
        });
        if (!bed) {
            throw new NotFoundError('Bed', bedId);
        }
        if (dto.bedNumber && dto.bedNumber !== bed.bedNumber) {
            const existing = await this.prisma.bed.findUnique({
                where: {
                    roomId_bedNumber: {
                        roomId: bed.roomId,
                        bedNumber: dto.bedNumber,
                    },
                },
                select: { id: true },
            });
            if (existing) {
                throw new ConflictError(`Bed '${dto.bedNumber}' already exists in this room`);
            }
        }
        const updated = await this.prisma.bed.update({
            where: { id: bedId },
            data: dto,
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: 'bed.update',
            entityType: 'Bed',
            entityId: bedId,
        });
        await this.invalidateRoomCache(bed.room.propertyId);
        return updated;
    }
    async archiveBed(bedId, orgId, userId) {
        const [bed, activeResident] = await Promise.all([
            this.prisma.bed.findFirst({
                where: { id: bedId, organizationId: orgId },
                include: { room: { select: { id: true, propertyId: true } } },
            }),
            this.prisma.resident.findFirst({
                where: {
                    bedId,
                    status: { in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'] },
                },
                select: { firstName: true },
            }),
        ]);
        if (!bed) {
            throw new NotFoundError('Bed', bedId);
        }
        if (activeResident) {
            throw new ConflictError(`Cannot archive occupied bed (Resident: ${activeResident.firstName}). Please reallocate first.`);
        }
        await this.prisma.bed.update({
            where: { id: bedId },
            data: { status: 'ARCHIVED' },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: 'bed.archive',
            entityType: 'Bed',
            entityId: bedId,
        });
        await this.invalidateRoomCache(bed.room.propertyId);
        return { success: true, message: 'Bed archived successfully' };
    }
    async toggleDisableRent(id, orgId, userId) {
        const room = await this.prisma.room.findFirst({
            where: { id, organizationId: orgId },
            select: { id: true, isDisabledForRent: true, propertyId: true },
        });
        if (!room) {
            throw new NotFoundError('Room', id);
        }
        const updated = await this.prisma.room.update({
            where: { id },
            data: { isDisabledForRent: !room.isDisabledForRent },
            include: {
                beds: {
                    where: { status: { not: 'ARCHIVED' } },
                    select: { id: true, bedNumber: true, status: true },
                    orderBy: { bedNumber: 'asc' },
                },
            },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: updated.isDisabledForRent
                ? 'room.disable_rent'
                : 'room.enable_rent',
            entityType: 'Room',
            entityId: id,
        });
        await this.invalidateRoomCache(room.propertyId);
        return updated;
    }
    async togglePublish(id, orgId, userId) {
        const room = await this.prisma.room.findFirst({
            where: { id, organizationId: orgId },
            select: { id: true, isPublished: true, propertyId: true },
        });
        if (!room) {
            throw new NotFoundError('Room', id);
        }
        const updated = await this.prisma.room.update({
            where: { id },
            data: { isPublished: !room.isPublished },
            include: {
                beds: {
                    where: { status: { not: 'ARCHIVED' } },
                    select: { id: true, bedNumber: true, status: true },
                    orderBy: { bedNumber: 'asc' },
                },
            },
        });
        this.logAudit({
            organizationId: orgId,
            userId,
            action: updated.isPublished ? 'room.publish' : 'room.unpublish',
            entityType: 'Room',
            entityId: id,
        });
        await this.invalidateRoomCache(room.propertyId);
        return updated;
    }
    async getInventoryStats(propertyId, orgId) {
        const cacheKey = `property:stats:${propertyId}`;
        const cached = await this.getCached(cacheKey);
        if (cached) {
            return cached;
        }
        const property = await this.prisma.property.findFirst({
            where: { id: propertyId, organizationId: orgId },
            select: { id: true },
        });
        if (!property) {
            throw new NotFoundError('Property', propertyId);
        }
        const [rooms, confirmedBookingsCount, pendingResidentsCount] = await Promise.all([
            this.prisma.room.findMany({
                where: {
                    propertyId,
                    organizationId: orgId,
                    status: { not: 'ARCHIVED' },
                },
                include: {
                    beds: {
                        where: { status: { not: 'ARCHIVED' } },
                        include: {
                            residents: {
                                where: {
                                    status: {
                                        in: ['ACTIVE', 'NOTICE_PERIOD', 'PENDING_MOVE_IN'],
                                    },
                                },
                            },
                            bookings: {
                                where: { status: { in: ['CONFIRMED'] } },
                            },
                        },
                    },
                },
            }),
            this.prisma.booking.count({
                where: {
                    propertyId,
                    organizationId: orgId,
                    status: 'CONFIRMED',
                },
            }),
            this.prisma.resident.count({
                where: {
                    propertyId,
                    organizationId: orgId,
                    status: 'PENDING_MOVE_IN',
                },
            }),
        ]);
        const newBookingsCount = (confirmedBookingsCount || 0) + (pendingResidentsCount || 0);
        let totalBeds = 0;
        let vacantRooms = 0;
        let semiVacantRooms = 0;
        let vacantBeds = 0;
        let overbookedRooms = 0;
        let overbookedBeds = 0;
        let occupiedRooms = 0;
        let occupiedBeds = 0;
        let underNoticeTenants = 0;
        let unverifiedRooms = 0;
        let maleRooms = 0;
        let femaleRooms = 0;
        let underNoticeWithBooking = 0;
        let disabledForRent = 0;
        let disabledForRentBeds = 0;
        for (const room of rooms) {
            if (room.isDisabledForRent) {
                disabledForRent++;
            }
            if (!room.isVerified) {
                unverifiedRooms++;
            }
            if (room.gender === 'MALE') {
                maleRooms++;
            }
            else if (room.gender === 'FEMALE') {
                femaleRooms++;
            }
            const roomBedCount = room.beds.length;
            totalBeds += roomBedCount;
            let roomOccupiedBeds = 0;
            let roomBookings = 0;
            for (const bed of room.beds) {
                const isBedDisabled = bed.isDisabledForRent || room.isDisabledForRent;
                if (isBedDisabled) {
                    disabledForRentBeds++;
                }
                const activeResidents = bed.residents.filter((r) => r.status === 'ACTIVE');
                const noticeResidents = bed.residents.filter((r) => r.status === 'NOTICE_PERIOD');
                const pendingResidents = bed.residents.filter((r) => r.status === 'PENDING_MOVE_IN');
                const totalResidents = activeResidents.length +
                    noticeResidents.length +
                    pendingResidents.length;
                const totalBookings = bed.bookings.length;
                underNoticeTenants += noticeResidents.length;
                if (noticeResidents.length > 0 && totalBookings > 0) {
                    underNoticeWithBooking += 1;
                }
                const isAllocated = totalResidents > 0 ||
                    bed.status === 'OCCUPIED' ||
                    bed.status === 'RESERVED';
                if (isAllocated) {
                    const count = Math.max(1, totalResidents);
                    occupiedBeds += count;
                    roomOccupiedBeds += count;
                }
                else if (!isBedDisabled &&
                    bed.status === 'AVAILABLE' &&
                    totalBookings === 0) {
                    vacantBeds++;
                }
                if (totalResidents > 1 || (totalResidents >= 1 && totalBookings > 0)) {
                    overbookedBeds++;
                }
                roomBookings += totalBookings;
            }
            if (roomOccupiedBeds > 0) {
                occupiedRooms++;
            }
            if (roomBedCount > 0 &&
                roomOccupiedBeds === 0 &&
                !room.isDisabledForRent) {
                vacantRooms++;
            }
            else if (roomOccupiedBeds > 0 && roomOccupiedBeds < roomBedCount) {
                semiVacantRooms++;
            }
            if (roomOccupiedBeds + roomBookings > roomBedCount && roomBedCount > 0) {
                overbookedRooms++;
            }
        }
        const result = {
            totalRooms: rooms.length,
            totalBeds,
            vacantRooms,
            semiVacantRooms,
            vacantBeds,
            overbookedRooms,
            overbookedBeds,
            occupiedRooms,
            occupiedBeds,
            newBookings: newBookingsCount,
            underNoticeTenants,
            unverifiedRooms,
            maleRooms,
            femaleRooms,
            underNoticeWithBooking,
            disabledForRent,
            disabledForRentBeds,
        };
        await this.setCached(cacheKey, result, 60);
        return result;
    }
};
RoomsService = RoomsService_1 = __decorate([
    Injectable(),
    __param(1, Optional()),
    __param(1, Inject(REDIS_CLIENT)),
    __metadata("design:paramtypes", [PrismaService, Function])
], RoomsService);
export { RoomsService };
//# sourceMappingURL=rooms.service.js.map