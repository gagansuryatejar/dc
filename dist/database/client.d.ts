import { PrismaClient } from '@prisma/client';
declare let prisma: PrismaClient;
/**
 * Connects to the database and verifies the connection is alive.
 * Should be called during application startup.
 */
declare function connectDatabase(): Promise<void>;
/**
 * Gracefully disconnects from the database.
 * Should be called during application shutdown.
 */
declare function disconnectDatabase(): Promise<void>;
export { prisma, connectDatabase, disconnectDatabase };
