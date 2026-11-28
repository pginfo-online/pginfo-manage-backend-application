var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var ExportService_1;
import { paymentPropertyScope } from '../../finance/domain/collection-lines.js';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { Monetary } from '../../finance/domain/monetary.js';
let ExportService = ExportService_1 = class ExportService {
    prisma;
    logger = new Logger(ExportService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    toCsv(headers, rows) {
        const escape = (val) => {
            const str = String(val ?? '');
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return `"${str.replace(/"/g, '""')}"`;
            }
            return str;
        };
        const headerLine = headers.map(escape).join(',');
        const rowLines = rows.map((r) => r.map(escape).join(','));
        return [headerLine, ...rowLines].join('\n');
    }
    async exportCollectionsCsv(orgId, propertyId) {
        const payments = await this.prisma.payment.findMany({
            where: {
                organizationId: orgId,
                status: 'CONFIRMED',
                ...paymentPropertyScope(propertyId),
            },
            include: {
                resident: {
                    include: { property: true },
                },
            },
            orderBy: { collectionDate: 'desc' },
        });
        const headers = [
            'Payment ID',
            'Date',
            'Resident Name',
            'Mobile',
            'Property',
            'Amount (INR)',
            'Mode',
            'Reference',
        ];
        const rows = payments.map((p) => [
            p.id,
            p.collectionDate.toISOString().slice(0, 10),
            `${p.resident.firstName} ${p.resident.lastName ?? ''}`.trim(),
            p.resident.mobile,
            p.resident.property?.name ?? '',
            Monetary.toRupees(p.amount - (p.gatewayRefundedAmount ?? 0)),
            p.mode,
            p.razorpayPaymentId ?? p.reference ?? '',
        ]);
        return this.toCsv(headers, rows);
    }
    async exportResidentsCsv(orgId, propertyId) {
        const residents = await this.prisma.resident.findMany({
            where: {
                organizationId: orgId,
                ...(propertyId ? { propertyId } : {}),
            },
            include: {
                property: true,
                room: true,
                bed: true,
            },
            orderBy: { joiningDate: 'desc' },
        });
        const headers = [
            'Resident ID',
            'First Name',
            'Last Name',
            'Mobile',
            'Email',
            'Property',
            'Room',
            'Bed',
            'Monthly Rent (INR)',
            'Deposit (INR)',
            'Joining Date',
            'Status',
        ];
        const rows = residents.map((r) => [
            r.id,
            r.firstName,
            r.lastName ?? '',
            r.mobile,
            r.email ?? '',
            r.property?.name ?? '',
            r.room?.roomNumber ?? '',
            r.bed?.bedNumber ?? '',
            Monetary.toRupees(r.monthlyRent),
            Monetary.toRupees(r.securityDeposit),
            r.joiningDate.toISOString().slice(0, 10),
            r.status,
        ]);
        return this.toCsv(headers, rows);
    }
    async exportExpensesCsv(orgId, propertyId) {
        const expenses = await this.prisma.expense.findMany({
            where: {
                organizationId: orgId,
                ...(propertyId ? { propertyId } : {}),
            },
            include: {
                category: true,
                property: true,
            },
            orderBy: { expenseDate: 'desc' },
        });
        const headers = [
            'Expense ID',
            'Date',
            'Property',
            'Category',
            'Description',
            'Amount (INR)',
            'Payment Mode',
            'Paid To',
            'Paid By',
        ];
        const rows = expenses.map((e) => [
            e.id,
            e.expenseDate.toISOString().slice(0, 10),
            e.property?.name ?? '',
            e.category?.name ?? '',
            e.description ?? '',
            Monetary.toRupees(e.amount),
            e.paymentMode,
            e.paidTo ?? '',
            e.paidBy ?? '',
        ]);
        return this.toCsv(headers, rows);
    }
};
ExportService = ExportService_1 = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService])
], ExportService);
export { ExportService };
//# sourceMappingURL=export.service.js.map