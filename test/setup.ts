import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { parseEnv } from 'node:util';

process.env['NODE_ENV'] = 'test';

const envTestPath = resolve(process.cwd(), '.env.test');
if (existsSync(envTestPath)) {
  for (const [key, value] of Object.entries(
    parseEnv(readFileSync(envTestPath, 'utf8')),
  )) {
    process.env[key] ??= value;
  }
}

// Fallbacks for test environment
process.env['DATABASE_URL'] =
  process.env['DATABASE_URL'] ||
  'postgresql://pginfo:pginfo_dev@localhost:5432/pginfo_dev?schema=public';
process.env['JWT_SECRET'] =
  process.env['JWT_SECRET'] || 'test-super-secret-key-at-least-32-chars-long!';
process.env['JWT_REFRESH_SECRET'] =
  process.env['JWT_REFRESH_SECRET'] ||
  'test-refresh-secret-key-at-least-32-chars-long!';

process.env['PAYOUT_BANK_ENCRYPTION_KEY'] ??= '7f'.repeat(32);
