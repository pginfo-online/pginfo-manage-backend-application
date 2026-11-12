import type { Prisma } from '@prisma/client';

const SYSTEM_EXPENSE_CATEGORIES = [
  'Salary',
  'Electrical Appliances',
  'Services',
  'Other',
  'Travel & Fuel',
  'Insurance Premium',
  'Loan EMI',
  'Maintenance',
  'Cleaning',
  'Tax',
  'Rent',
  'Groceries',
  'EMI',
  'Salaries',
  'Electrical Services',
  'Plumbing',
  'Cleaning Supplies',
  'Internet & WiFi',
  'Water',
  'Electricity Bill',
  'Gas',
  'Repairs & Maintenance',
  'Security',
  'Miscellaneous',
];

const SYSTEM_COMPLAINT_CATEGORIES = [
  'Agreements',
  'Application Issues',
  'Amenities',
  'Electrical Appliances',
  'Food',
  'Housekeeping',
  'Payments',
  'Staff',
  'Plumbing',
  'Internet & WiFi',
  'Other',
];

const SYSTEM_STAFF_DESIGNATIONS = [
  'Cook',
  'Cleaner',
  'Plumber',
  'Guard',
  'Manager',
  'Electrician',
  'Warden',
];

export async function createOrganizationWithOwner(
  tx: Prisma.TransactionClient,
  input: { userId: string; name: string; slug: string },
) {
  const organization = await tx.organization.create({
    data: {
      name: input.name,
      slug: input.slug,
    },
  });

  await tx.organizationMember.create({
    data: {
      userId: input.userId,
      organizationId: organization.id,
      role: 'OWNER',
    },
  });

  await Promise.all([
    tx.expenseCategory.createMany({
      data: SYSTEM_EXPENSE_CATEGORIES.map((name) => ({
        organizationId: organization.id,
        name,
        isSystem: true,
      })),
    }),
    tx.complaintCategory.createMany({
      data: SYSTEM_COMPLAINT_CATEGORIES.map((name) => ({
        organizationId: organization.id,
        name,
        isSystem: true,
      })),
    }),
    tx.staffDesignation.createMany({
      data: SYSTEM_STAFF_DESIGNATIONS.map((name) => ({
        organizationId: organization.id,
        name,
        isSystem: true,
      })),
    }),
    tx.auditLog.create({
      data: {
        organizationId: organization.id,
        userId: input.userId,
        action: 'organization.create',
        entityType: 'Organization',
        entityId: organization.id,
      },
    }),
  ]);

  return organization;
}

export function generateOrganizationSlug(name: string): string {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 45);

  return slug || 'organization';
}
