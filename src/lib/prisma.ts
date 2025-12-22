/**
 * Centralized PrismaClient singleton for Notification Service
 * Uses the new Prisma 7 driver adapter pattern
 */
import { PrismaClient, Prisma } from '../generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

// Create the PostgreSQL adapter with connection string
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

// Export singleton PrismaClient instance
export const prisma = new PrismaClient({ adapter });

// Re-export all types and enum values from generated client
export {
    PrismaClient,
    Prisma,
} from '../generated/prisma/client';

// Re-export types (will be available after prisma generate)
// export type {
//     Notification,
//     NotificationTemplate,
// } from '../generated/prisma/client';
