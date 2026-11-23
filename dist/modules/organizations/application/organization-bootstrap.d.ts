import type { Prisma } from '@prisma/client';
export declare function createOrganizationWithOwner(tx: Prisma.TransactionClient, input: {
    userId: string;
    name: string;
    slug: string;
}): Promise<{
    id: string;
    name: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    slug: string;
}>;
export declare function generateOrganizationSlug(name: string): string;
