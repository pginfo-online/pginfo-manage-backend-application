import { createHash, randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { Prisma, PrismaClient } from '@prisma/client';
import { z } from 'zod';
import {
  dateKeyInTimeZone,
  dateOnlyKey,
} from '../src/common/time/property-date.js';
import { loginSchema } from '../src/modules/identity/api/dto/auth.dto.js';
import { generateOrganizationSlug } from '../src/modules/organizations/application/organization-bootstrap.js';

const ownerFolders = [
  'Keshav',
  'Kiran Chavan',
  'Not Provided',
  'Pawan',
  'Prathamesh Khamkar',
  'Suryakant',
  'Vishal Bhosale',
];
const categoryNames = {
  cleaning: 'Cleaning',
  electricity: 'Electricity Bill',
  housekeeping: 'Housekeeping',
  maintenance: 'Maintenance',
  other: 'Other',
  salary: 'Salary',
  security: 'Security',
  water: 'Water',
} as const;
const modes = {
  cash: 'CASH',
  upi: 'UPI',
  cheque: 'CHEQUE',
  bank_transfer: 'BANK_TRANSFER',
  other: 'OTHER',
} as const;

const importAction = 'organization.import_pg_online_finance';
const importPrefix = 'pg-online-finance';
const text = z.string().trim().min(1);
const optionalText = z
  .string()
  .trim()
  .nullable()
  .transform((value) => value || null);
const timestamp = z
  .string()
  .datetime({ offset: true })
  .transform((value) => new Date(value));
const money = z
  .number()
  .nonnegative()
  .transform((rupees) => Math.round(rupees * 100))
  .pipe(z.number().int().max(2_147_483_647));
const mode = z
  .enum(['cash', 'upi', 'cheque', 'bank_transfer', 'other'])
  .transform((value) => modes[value]);
const exportSchema = z.object({
  exportMetadata: z.object({
    sourceDatabase: z.literal('pgOnline'),
    ownerNameFromRequest: text,
    matchedPhoneLastFour: z.array(z.string().regex(/^\d{4}$/)).min(1),
  }),
  // This export's actual receipts live on the rent records.
  payments: z.array(z.unknown()).length(0),
  rentRecords: z.array(
    z.object({
      property: text,
      tenantName: text,
      tenantPhone: text,
      billingMonth: z.number().int().min(1).max(12),
      billingYear: z.number().int().min(2000).max(9999),
      billingPeriodStart: timestamp,
      billingPeriodEnd: timestamp,
      dueDate: timestamp,
      rentAmount: money,
      discount: money,
      lateFee: money,
      lateFeeApplied: z.boolean(),
      additionalCharges: z.array(z.unknown()).length(0),
      totalAmount: money,
      paidAmount: money,
      outstandingAmount: money,
      status: z.enum(['pending', 'partial', 'paid']),
      invoiceNumber: optionalText,
      paymentHistory: z.array(
        z.object({
          amount: money,
          method: mode,
          paidAt: timestamp,
          notes: optionalText,
        }),
      ),
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ),
  expenses: z.array(
    z.object({
      property: text,
      amount: money,
      category: z
        .enum([
          'cleaning',
          'electricity',
          'housekeeping',
          'maintenance',
          'other',
          'salary',
          'security',
          'water',
        ])
        .transform((value) => categoryNames[value]),
      description: optionalText,
      expenseDate: timestamp,
      paymentMethod: mode,
      status: z.literal('approved'),
      isRecurring: z.literal(false),
      vendor: optionalText,
      staffName: optionalText,
      notes: optionalText,
      referenceNumber: optionalText,
      createdAt: timestamp,
      updatedAt: timestamp,
    }),
  ),
});

function requireData(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function digest(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function expenseId(scope: string, createdAt: Date) {
  // The export omits MongoDB IDs. Source property and creation time are unique
  // for these expenses, and stay stable if an export is reordered.
  const hex = digest(
    `${importPrefix}:expense:${scope}:${createdAt.toISOString()}`,
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-8${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function mobile(value: string) {
  const result = loginSchema.safeParse({ mobile: value, password: 'unused' });
  return result.success && 'mobile' in result.data ? result.data.mobile : null;
}

function dateOnly(value: Date) {
  return new Date(dateOnlyKey(value));
}

async function readExport(folder: string) {
  const url = new URL(
    `../payments_and_expenses/${encodeURIComponent(folder)}/payments_and_expenses.json`,
    import.meta.url,
  );
  const raw = await readFile(fileURLToPath(url), 'utf8');
  const parsed = exportSchema.safeParse(JSON.parse(raw));
  if (!parsed.success) {
    const paths = parsed.error.issues.map(({ path }) => path.join('.'));
    throw new Error(`Invalid export in ${folder} at ${paths.join(', ')}`);
  }
  const data = parsed.data;
  requireData(
    data.exportMetadata.ownerNameFromRequest === folder,
    `Owner label differs in ${folder}`,
  );
  const ownerFolder = folder === 'Not Provided' ? 'Freindszone' : folder;
  return {
    folder,
    slug: `pg-online-${generateOrganizationSlug(ownerFolder)}`,
    checksum: digest(JSON.stringify(data)),
    ...data,
  };
}

async function importOwner(
  tx: Prisma.TransactionClient,
  source: Awaited<ReturnType<typeof readExport>>,
  today: string,
  apply: boolean,
) {
  const { folder } = source;
  const organization = await tx.organization.findUnique({
    where: { slug: source.slug },
    select: {
      id: true,
      isActive: true,
      auditLogs: {
        where: { action: 'organization.import_pg_online' },
        select: { userId: true, user: { select: { mobile: true } } },
      },
      members: {
        where: { role: 'OWNER', isActive: true },
        select: { userId: true },
      },
      properties: { select: { id: true, name: true, status: true } },
    },
  });
  const priorImport = organization?.auditLogs[0];
  const userId = priorImport?.userId;
  const lastFour = priorImport?.user?.mobile?.match(/\d{4}$/)?.[0];
  requireData(
    organization?.isActive &&
      organization.auditLogs.length === 1 &&
      userId &&
      lastFour &&
      source.exportMetadata.matchedPhoneLastFour.includes(lastFour) &&
      organization.members.some((member) => member.userId === userId),
    `Could not verify the imported owner for ${folder}`,
  );
  const organizationId = organization.id;
  const properties = organization.properties;
  function propertyFor(name: string) {
    const matches = properties.filter(
      (property) => normalizeName(property.name) === normalizeName(name),
    );
    requireData(
      matches.length === 1,
      `Missing or ambiguous property in ${folder}`,
    );
    return matches[0]!;
  }

  function isDemoRecord(record: { property: string }) {
    const property = propertyFor(record.property);
    // The property import used this naming rule to deactivate demo properties.
    return (
      property.status === 'INACTIVE' &&
      /^(demo\b|demo\d|test$)/i.test(property.name)
    );
  }

  const demoRents = source.rentRecords.filter(isDemoRecord);
  const rentRecords = source.rentRecords.filter((rent) => !isDemoRecord(rent));
  const expenses = source.expenses.filter((expense) => !isDemoRecord(expense));
  const counts = {
    folder,
    bills: rentRecords.length,
    payments: rentRecords.reduce(
      (count, rent) => count + rent.paymentHistory.length,
      0,
    ),
    expenses: expenses.length,
    billedPaise: rentRecords.reduce((sum, rent) => sum + rent.totalAmount, 0),
    collectedPaise: rentRecords.reduce((sum, rent) => sum + rent.paidAmount, 0),
    outstandingPaise: rentRecords.reduce(
      (sum, rent) => sum + rent.outstandingAmount,
      0,
    ),
    expensePaise: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    demoBills: demoRents.length,
    demoPayments: demoRents.reduce(
      (sum, rent) => sum + rent.paymentHistory.length,
      0,
    ),
    demoExpenses: source.expenses.length - expenses.length,
    newBills: 0,
    linkedBills: 0,
    newPayments: 0,
    newExpenses: 0,
  };
  if (!counts.bills && !counts.expenses) return counts;

  const completed = await tx.auditLog.findFirst({
    where: { organizationId, action: importAction },
    select: { metadata: true },
  });
  if (completed) {
    const result = z
      .object({ checksum: z.string() })
      .safeParse(completed.metadata);
    requireData(
      result.success && result.data.checksum === source.checksum,
      `A different finance export was already applied for ${folder}`,
    );
    return counts;
  }

  const residents = await tx.resident.findMany({
    where: { organizationId },
    select: {
      id: true,
      propertyId: true,
      firstName: true,
      lastName: true,
      mobile: true,
    },
  });
  const matchedRents = rentRecords.map((rent, index) => {
    const propertyId = propertyFor(rent.property).id;
    const number = mobile(rent.tenantPhone);
    const matches = residents.filter(
      (resident) =>
        resident.propertyId === propertyId &&
        number &&
        mobile(resident.mobile) === number &&
        normalizeName(
          [resident.firstName, resident.lastName].filter(Boolean).join(' '),
        ) === normalizeName(rent.tenantName),
    );
    const label = `${folder} rentRecords[${index}]`;
    requireData(
      matches.length === 1,
      `Missing or ambiguous resident in ${label}`,
    );
    const residentId = matches[0]!.id;
    const month = `${rent.billingYear}-${String(rent.billingMonth).padStart(2, '0')}`;
    const key = `${importPrefix}:rent:${residentId}:${month}`;
    return { rent, residentId, propertyId, month, key, label };
  });
  requireData(
    new Set(matchedRents.map(({ key }) => key)).size === matchedRents.length,
    `Duplicate monthly rent in ${folder}`,
  );

  const residentIds = [
    ...new Set(matchedRents.map(({ residentId }) => residentId)),
  ];
  const existingBills = await tx.billingRecord.findMany({
    where: { organizationId, residentId: { in: residentIds }, type: 'RENT' },
    include: {
      _count: {
        select: { payments: true, allocations: true, rentInvoices: true },
      },
    },
  });
  const billsToCreate: Prisma.BillingRecordCreateManyInput[] = [];
  const billsToLink: Array<{
    id: string;
    version: number;
    data: Prisma.BillingRecordUpdateManyMutationInput;
  }> = [];
  const payments: Prisma.PaymentCreateManyInput[] = [];
  for (const {
    rent,
    residentId,
    propertyId,
    month,
    key,
    label,
  } of matchedRents) {
    const due = dateOnlyKey(rent.dueDate);
    const periodStart = dateOnlyKey(rent.billingPeriodStart);
    const periodEnd = dateOnlyKey(rent.billingPeriodEnd);
    const lateFeeAmount = rent.lateFeeApplied ? rent.lateFee : 0;
    const paid = rent.paymentHistory.reduce(
      (sum, payment) => sum + payment.amount,
      0,
    );
    requireData(
      periodStart.startsWith(month) &&
        periodEnd.startsWith(month) &&
        periodStart <= periodEnd &&
        rent.totalAmount > 0 &&
        rent.totalAmount === rent.rentAmount + lateFeeAmount - rent.discount &&
        rent.paidAmount === paid &&
        rent.outstandingAmount === rent.totalAmount - paid &&
        rent.outstandingAmount >= 0 &&
        rent.status ===
          (paid === rent.totalAmount ? 'paid' : paid ? 'partial' : 'pending') &&
        rent.updatedAt >= rent.createdAt,
      `Inconsistent period or balance in ${label}`,
    );
    const period = {
      billingMonth: rent.billingMonth,
      billingYear: rent.billingYear,
      periodStart: dateOnly(rent.billingPeriodStart),
      periodEnd: dateOnly(rent.billingPeriodEnd),
      idempotencyKey: key,
    };
    const existing = existingBills.find(
      (bill) =>
        bill.residentId === residentId &&
        bill.billingMonth === rent.billingMonth &&
        bill.billingYear === rent.billingYear,
    );
    requireData(!existing, `A monthly rent charge already exists for ${label}`);

    // This charge may already have been entered in-app before the finance
    // import. Link an exact, empty Monthly Rent charge without rewriting its
    // due date, balance, description, or existing payment links.
    const candidates = existingBills.filter(
      (bill) =>
        bill.residentId === residentId &&
        bill.propertyId === propertyId &&
        bill.billingMonth === null &&
        bill.billingYear === null &&
        bill.description === 'Monthly Rent' &&
        dateOnlyKey(bill.dueDate).startsWith(month) &&
        bill.amount === rent.totalAmount,
    );
    requireData(
      candidates.length <= 1,
      `Ambiguous in-app Monthly Rent charge for ${label}`,
    );
    const manual = candidates[0];
    if (manual) {
      requireData(
        rent.status === 'pending' &&
          !rent.discount &&
          !lateFeeAmount &&
          (manual.status === 'ISSUED' ||
            manual.status === 'DUE' ||
            manual.status === 'OVERDUE') &&
          !manual.paidAmount &&
          !manual.discountAmount &&
          !manual.lateFeeAmount &&
          !manual.idempotencyKey &&
          !manual.periodStart &&
          !manual.periodEnd &&
          !manual._count.payments &&
          !manual._count.allocations &&
          !manual._count.rentInvoices,
        `In-app Monthly Rent charge needs reconciliation for ${label}`,
      );
      billsToLink.push({
        id: manual.id,
        version: manual.version,
        data: period,
      });
      continue;
    }

    const id = randomUUID();
    billsToCreate.push({
      id,
      organizationId,
      residentId,
      propertyId,
      type: 'RENT',
      ...period,
      status:
        rent.status === 'paid'
          ? 'PAID'
          : rent.status === 'partial'
            ? 'PARTIALLY_PAID'
            : due < today
              ? 'OVERDUE'
              : 'DUE',
      description: rent.invoiceNumber
        ? `Rent for ${month} (PG Online invoice ${rent.invoiceNumber})`
        : `Rent for ${month}`,
      amount: rent.totalAmount,
      paidAmount: paid,
      lateFeeAmount,
      discountAmount: rent.discount,
      dueDate: dateOnly(rent.dueDate),
      createdAt: rent.createdAt,
      updatedAt: rent.updatedAt,
    });
    for (const [index, payment] of rent.paymentHistory.entries()) {
      const collectionDay = dateKeyInTimeZone(payment.paidAt, 'Asia/Kolkata');
      requireData(
        payment.amount > 0 && collectionDay <= today,
        `Invalid receipt in ${label}`,
      );
      payments.push({
        organizationId,
        residentId,
        billingRecordId: id,
        capturePropertyId: propertyId,
        amount: payment.amount,
        mode: payment.method,
        status: 'CONFIRMED',
        collectionDate: new Date(collectionDay),
        notes: payment.notes,
        recordedBy: userId,
        idempotencyKey: `${key}:payment:${index + 1}`,
        createdAt: payment.paidAt,
        updatedAt: payment.paidAt,
      });
    }
  }

  const categoryNamesUsed = new Set(expenses.map(({ category }) => category));
  const categories = new Map(
    (
      await tx.expenseCategory.findMany({
        where: { organizationId, name: { in: [...categoryNamesUsed] } },
        select: { id: true, name: true, isActive: true },
      })
    ).map((category) => [category.name, category]),
  );
  const newCategories: Prisma.ExpenseCategoryCreateManyInput[] = [];
  for (const name of categoryNamesUsed) {
    const category = categories.get(name);
    requireData(
      !category || category.isActive,
      `Expense category ${name} is inactive in ${folder}`,
    );
    if (!category) {
      const id = randomUUID();
      categories.set(name, { id, name, isActive: true });
      newCategories.push({ id, name, organizationId });
    }
  }

  const expenseRows = expenses.map((expense, index) => {
    const propertyId = propertyFor(expense.property).id;
    requireData(
      expense.amount > 0 &&
        dateOnlyKey(expense.expenseDate) <= today &&
        expense.updatedAt >= expense.createdAt,
      `Invalid expense in ${folder} expenses[${index}]`,
    );
    return {
      id: expenseId(`${organizationId}:${propertyId}`, expense.createdAt),
      organizationId,
      propertyId,
      categoryId: categories.get(expense.category)!.id,
      amount: expense.amount,
      expenseDate: dateOnly(expense.expenseDate),
      paymentMode: expense.paymentMethod,
      paidTo: expense.vendor ?? expense.staffName,
      description: expense.description,
      notes:
        [
          expense.notes,
          expense.referenceNumber && `Reference: ${expense.referenceNumber}`,
        ]
          .filter(Boolean)
          .join('\n') || null,
      createdBy: userId,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
    };
  });
  requireData(
    new Set(expenseRows.map(({ id }) => id)).size === expenseRows.length,
    `Duplicate source expense ID in ${folder}`,
  );
  const existingExpenses = await tx.expense.findMany({
    where: {
      organizationId,
      expenseDate: { in: expenseRows.map(({ expenseDate }) => expenseDate) },
      propertyId: { in: expenseRows.map(({ propertyId }) => propertyId) },
    },
    select: {
      id: true,
      propertyId: true,
      amount: true,
      expenseDate: true,
      paymentMode: true,
    },
  });
  const expensesToCreate = expenseRows.filter((expense) => {
    if (existingExpenses.some(({ id }) => id === expense.id)) return false;
    requireData(
      !existingExpenses.some(
        (existing) =>
          existing.propertyId === expense.propertyId &&
          existing.amount === expense.amount &&
          existing.paymentMode === expense.paymentMode &&
          +existing.expenseDate === +expense.expenseDate,
      ),
      `An in-app expense needs reconciliation in ${folder}`,
    );
    return true;
  });

  counts.newBills = billsToCreate.length;
  counts.linkedBills = billsToLink.length;
  counts.newPayments = payments.length;
  counts.newExpenses = expensesToCreate.length;
  if (!apply) return counts;

  if (billsToCreate.length)
    await tx.billingRecord.createMany({ data: billsToCreate });
  for (const charge of billsToLink) {
    const affected = await tx.billingRecord.updateMany({
      where: { id: charge.id, organizationId, version: charge.version },
      data: { ...charge.data, version: { increment: 1 } },
    });
    requireData(
      affected.count === 1,
      `In-app charge changed during import in ${folder}`,
    );
  }
  if (payments.length) await tx.payment.createMany({ data: payments });
  if (newCategories.length)
    await tx.expenseCategory.createMany({ data: newCategories });
  if (expensesToCreate.length)
    await tx.expense.createMany({ data: expensesToCreate });
  await tx.auditLog.create({
    data: {
      organizationId,
      userId,
      action: importAction,
      entityType: 'Organization',
      entityId: organizationId,
      metadata: { ...counts, checksum: source.checksum },
    },
  });
  return counts;
}

async function main() {
  const { values } = parseArgs({
    options: { apply: { type: 'boolean', default: false } },
  });
  requireData(process.env.DATABASE_URL, 'Supply DATABASE_URL explicitly');
  const sources = await Promise.all(ownerFolders.map(readExport));
  const url = new URL(process.env.DATABASE_URL);
  url.searchParams.set('connection_limit', '1');
  const db = new PrismaClient({
    datasourceUrl: url.href,
    errorFormat: 'minimal',
  });
  try {
    const today = dateKeyInTimeZone(new Date(), 'Asia/Kolkata');
    const results = await db.$transaction(
      async (tx) => {
        const [lock] = await tx.$queryRaw<
          { locked: boolean }[]
        >`SELECT pg_try_advisory_xact_lock(35178202421) AS locked`;
        requireData(
          lock?.locked,
          'The legacy finance import is already running',
        );
        const result = [];
        for (const source of sources)
          result.push(await importOwner(tx, source, today, values.apply));
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        timeout: 60_000,
      },
    );
    console.log(values.apply ? 'Committed finance import' : 'Preflight only');
    console.table(results);
  } finally {
    await db.$disconnect();
  }
}

main().catch((error) => {
  // Prisma errors can embed statement arguments with resident information.
  const message =
    error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : error instanceof Prisma.PrismaClientValidationError
        ? 'Database statement validation failed'
        : error instanceof Prisma.PrismaClientInitializationError
          ? 'Database connection failed'
          : error instanceof Error
            ? error.message
            : 'Unknown import error';
  console.error(message);
  process.exitCode = 1;
});
