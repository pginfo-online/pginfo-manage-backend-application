import { paymentPropertyScope } from '../../finance/domain/collection-lines.js';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../platform/database/index.js';
import { Monetary } from '../../finance/domain/monetary.js';

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: converts rows of objects to CSV formatted string.
   */
  private toCsv(headers: string[], rows: (string | number)[][]): string {
    const escape = (val: string | number) => {
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

  /**
   * Exports collections / payments to CSV.
   */
  async exportCollectionsCsv(
    orgId: string,
    propertyId?: string,
  ): Promise<string> {
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

  /**
   * Exports residents registry to CSV.
   */
  async exportResidentsCsv(
    orgId: string,
    propertyId?: string,
  ): Promise<string> {
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

  /**
   * Exports operating expenses to CSV.
   */
  async exportExpensesCsv(orgId: string, propertyId?: string): Promise<string> {
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
}
