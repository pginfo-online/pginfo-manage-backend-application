import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { ZodValidationPipe } from '../../src/common/validation/index.js';
import { BadRequestException } from '@nestjs/common';

describe('ZodValidationPipe', () => {
  const schema = z.object({
    name: z.string().min(3),
    age: z.number().int().positive(),
  });

  const pipe = new ZodValidationPipe(schema);

  it('should successfully validate valid data', () => {
    const input = { name: 'Madhav', age: 25 };
    const result = pipe.transform(input, { type: 'body' });
    expect(result).toEqual(input);
  });

  it('should throw BadRequestException for invalid data', () => {
    const invalidInput = { name: 'M', age: -5 };
    expect(() => pipe.transform(invalidInput, { type: 'body' })).toThrow(
      BadRequestException,
    );
  });

  it('should pass through when no schema is provided and metatype has no schema', () => {
    const emptyPipe = new ZodValidationPipe();
    const input = { hello: 'world' };
    const result = emptyPipe.transform(input, { type: 'body' });
    expect(result).toEqual(input);
  });
});
