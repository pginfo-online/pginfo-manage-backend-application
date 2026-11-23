import { ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export async function detectAdminWriteConflict<T>(operation: Promise<T>) {
  try {
    return await operation;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2025', 'P2034'].includes(error.code)
    ) {
      throw new ConflictException(
        'This record changed concurrently. Refresh and try again.',
      );
    }
    throw error;
  }
}
