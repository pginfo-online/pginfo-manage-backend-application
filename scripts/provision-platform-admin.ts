import { PrismaClient } from '@prisma/client';
import { PasswordHasher } from '../src/modules/identity/domain/password-hasher.js';

const prisma = new PrismaClient();

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function readHidden(prompt: string): Promise<string> {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    throw new Error('Run this command in an interactive terminal');
  }

  process.stdout.write(prompt);
  process.stdin.setRawMode(true);
  process.stdin.resume();
  process.stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';

    const cleanup = () => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdin.pause();
      process.stdout.write('\n');
    };

    const onData = (input: string) => {
      for (const character of input) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Password entry cancelled'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u007f' || character === '\b') {
          value = [...value].slice(0, -1).join('');
        } else if (character >= ' ') {
          value += character;
        }
      }
    };

    process.stdin.on('data', onData);
  });
}

async function main(): Promise<void> {
  const email = argument('email')?.trim().toLowerCase();
  const firstName = argument('first-name')?.trim();
  const lastName = argument('last-name')?.trim();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(
      'Usage: pnpm admin:provision -- --email admin@example.com --first-name Admin [--last-name Name]',
    );
  }
  if (!firstName) {
    throw new Error('--first-name is required');
  }

  const password = await readHidden('New admin password: ');
  const confirmation = await readHidden('Confirm admin password: ');
  if (password !== confirmation) {
    throw new Error('Passwords do not match');
  }
  if (
    password.length < 12 ||
    password.length > 100 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error(
      'Password must be 12-100 characters and contain uppercase, lowercase, and numeric characters',
    );
  }

  const passwordHash = await PasswordHasher.hash(password);
  const admin = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT true AS locked WHERE pg_advisory_xact_lock(2026110317) IS NULL`;

    if ((await tx.platformAdmin.count()) > 0) {
      throw new Error(
        'Provisioning refused: a platform administrator already exists. Use the authenticated admin API or authorized recovery.',
      );
    }

    if (await tx.user.findUnique({ where: { email } })) {
      throw new Error(
        'A user with this email already exists. Use admin:bootstrap for an existing user when no platform admins exist.',
      );
    }

    const user = await tx.user.create({
      data: {
        email,
        passwordHash,
        firstName,
        lastName: lastName || undefined,
      },
    });

    const createdAdmin = await tx.platformAdmin.create({
      data: { userId: user.id, role: 'SUPER_ADMIN' },
    });

    await tx.auditLog.create({
      data: {
        userId: user.id,
        action: 'platform_admin.provision',
        entityType: 'PlatformAdmin',
        entityId: createdAdmin.id,
        metadata: { email, role: 'SUPER_ADMIN' },
      },
    });

    return createdAdmin;
  });

  console.log(`Provisioned initial SUPER_ADMIN ${admin.id} for ${email}`);
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
