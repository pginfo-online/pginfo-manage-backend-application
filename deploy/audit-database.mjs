// Read-only inspection: no migrations, schema changes, seeds, or customer row reads.
import { readFileSync, readdirSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const file = process.argv[2];
const env = file ? parseEnv(readFileSync(file, 'utf8')) : process.env;
const url = new URL(env.DATABASE_URL);
url.searchParams.set('sslmode', 'require');
url.searchParams.set('connection_limit', '1');
url.searchParams.set('connect_timeout', '10');
const prisma = new PrismaClient({ datasourceUrl: url.toString(), log: [] });
try {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
    const migrations = await tx.$queryRawUnsafe(
      'SELECT migration_name, checksum, finished_at, rolled_back_at FROM _prisma_migrations ORDER BY migration_name',
    );
    const local = readdirSync('prisma/migrations', { withFileTypes: true }).filter((x) => x.isDirectory()).map((x) => x.name);
    const applied = migrations.filter((x) => x.finished_at && !x.rolled_back_at);
    const result = {
      databaseAuthenticated: true,
      transactionReadOnly: true,
      // TLS enforced on client->pooler. pg_stat_ssl would describe pooler->database instead.
      clientTlsRequired: true,
      strictCertificateVerification: url.searchParams.get('sslaccept') === 'strict',
      appliedMigrations: applied.length,
      pendingMigrations: local.filter((x) => !applied.some((y) => y.migration_name === x)),
      checksumMismatches: applied.filter((x) => local.includes(x.migration_name) &&
        createHash('sha256').update(readFileSync(`prisma/migrations/${x.migration_name}/migration.sql`)).digest('hex') !== x.checksum).map((x) => x.migration_name),
      unresolvedMigrations: migrations.filter((x) => !x.finished_at && !x.rolled_back_at).map((x) => x.migration_name),
    };
    console.log(JSON.stringify(result, null, 2));
    if (result.checksumMismatches.length || result.unresolvedMigrations.length) process.exitCode = 1;
  }, { timeout: 20000 });
} catch (error) {
  console.error(JSON.stringify({ databaseAuthenticated: false, errorCode: error.code ?? 'unknown', errorType: error.constructor.name }));
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
