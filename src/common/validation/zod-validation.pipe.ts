import {
  type PipeTransform,
  type ArgumentMetadata,
  BadRequestException,
  Injectable,
} from '@nestjs/common';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Global validation pipe that validates request payloads against a Zod schema.
 *
 * Usage in controllers:
 *   @Body(new ZodValidationPipe(mySchema)) body: MyDto
 *   @Query(new ZodValidationPipe(querySchema)) query: MyQuery
 *
 * Or applied globally for DTO-level validation when schemas are
 * attached to the DTO class via a static `schema` property.
 */
@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema?: ZodSchema) {}

  transform(value: unknown, metadata: ArgumentMetadata): unknown {
    // If constructed with a schema, always use it
    if (this.schema) {
      return this.validate(this.schema, value);
    }

    // If the metatype has a static `schema` property, use that
    const metatype = metadata.metatype as
      (Function & { schema?: ZodSchema }) | undefined;

    if (metatype?.schema) {
      return this.validate(metatype.schema, value);
    }

    // No schema available — pass through
    return value;
  }

  private validate(schema: ZodSchema, value: unknown): unknown {
    const result = schema.safeParse(value);

    if (result.success) {
      return result.data;
    }

    throw new BadRequestException(formatZodErrors(result.error));
  }
}

/**
 * Formats Zod validation errors into RFC 9457-compatible field-level details.
 */
function formatZodErrors(error: ZodError): {
  message: string;
  errors: Array<{ field: string; message: string }>;
} {
  const errors = error.issues.map((issue) => ({
    field: issue.path.join('.'),
    message: issue.message,
  }));

  return {
    message: 'Validation failed',
    errors,
  };
}
