import { envSchema } from './env.schema.js';
export function validate(config) {
    const result = envSchema.safeParse(config);
    if (!result.success) {
        const formatted = result.error.issues
            .map((issue) => `  • ${issue.path.join('.')}: ${issue.message}`)
            .join('\n');
        throw new Error(`\n❌ Invalid environment configuration:\n${formatted}\n\nFix the above variables in your .env file or environment.\n`);
    }
    return result.data;
}
//# sourceMappingURL=env.validation.js.map