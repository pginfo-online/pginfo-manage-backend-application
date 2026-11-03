import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

async function main() {
  const email = argument('email')?.trim().toLowerCase();
  if (!email) {
    throw new Error(
      'Usage: pnpm admin:bootstrap -- --email existing-user@example.com',
    );
  }
  const existingAdmins = await prisma.platformAdmin.count();
  if (existingAdmins > 0) {
    throw new Error(
      'Bootstrap refused: a platform administrator already exists. Use the authenticated admin API.',
    );
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.isActive) {
    throw new Error('An active existing user with that email is required');
  }
  const admin = await prisma.$transaction(async (tx) => {
    const created = await tx.platformAdmin.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });
    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'platform_admin.bootstrap',
        entityType: 'PlatformAdmin',
        entityId: created.id,
        metadata: { email, role: 'SUPER_ADMIN' },
      },
    });
    return created;
  });
  console.log(`Bootstrapped SUPER_ADMIN ${admin.id} for ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
