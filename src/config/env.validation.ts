import { envSchema, type EnvConfig } from './env.schema.js';

/**
 * Custom NestJS ConfigModule validation function.
 * Parses process.env through the Zod schema and throws
 * a descriptive error on any missing or invalid variable.
 */
export function validate(config: Record<string, unknown>): EnvConfig {
  const result = envSchema.safeParse(config);

  if (!result.success) {
    const formatted = result.error.issues
      .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `\n❌ Invalid environment configuration:\n${formatted}\n\nFix the above variables in your .env file or environment.\n`,
    );
  }

  return result.data;
}
