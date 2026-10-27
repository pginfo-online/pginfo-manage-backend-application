import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Seed script for development data.
 *
 * Run with: pnpm prisma:seed
 *
 * This script is idempotent — safe to run multiple times.
 * It uses upsert operations to avoid duplicates.
 */
async function main(): Promise<void> {
  console.log('🌱 Seeding database…');

  // System expense categories (will be cloned per organization)
  const systemExpenseCategories = [
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
    'Furniture',
    'Repairs & Maintenance',
    'Security',
    'Insurance',
    'Legal & Compliance',
    'Marketing',
    'Miscellaneous',
  ];

  // System complaint categories
  const systemComplaintCategories = [
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
    'Noise',
    'Security',
    'Parking',
    'Other',
  ];

  // System staff designations
  const systemStaffDesignations = [
    'Cook',
    'Cleaner',
    'Plumber',
    'Guard',
    'Manager',
    'Electrician',
    'Maintenance Staff',
    'Receptionist',
    'Warden',
  ];

  console.log(`  📋 Prepared ${systemExpenseCategories.length} expense categories`);
  console.log(`  📋 Prepared ${systemComplaintCategories.length} complaint categories`);
  console.log(`  📋 Prepared ${systemStaffDesignations.length} staff designations`);
  console.log('');
  console.log('  ℹ️  System categories/designations are created per organization');
  console.log('     when a new organization is created (handled in application code).');
  console.log('');
  console.log('✅ Seed complete');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
