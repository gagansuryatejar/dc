import pkg from '@prisma/client';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { createModuleLogger } from '../utils/logger.js';

const logger = createModuleLogger('database');

// Resilient constructor supporting both CommonJS and ESM module loaders
const PrismaClientConstructor =
  (pkg as any).PrismaClient ?? (pkg as any).default?.PrismaClient ?? pkg;

let prisma: PrismaClientType;

/**
 * Returns the singleton PrismaClient instance.
 * Creates a new instance if one does not exist.
 */
function getPrismaClient(): PrismaClientType {
  if (!prisma) {
    prisma = new PrismaClientConstructor({
      log: [
        { level: 'error', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    prisma.$on('error' as never, (e: unknown) => {
      logger.error({ error: e }, 'Prisma client error');
    });

    prisma.$on('warn' as never, (e: unknown) => {
      logger.warn({ warning: e }, 'Prisma client warning');
    });
  }

  return prisma;
}

prisma = getPrismaClient();

/**
 * Connects to the database and verifies the connection is alive.
 * Should be called during application startup.
 */
async function connectDatabase(): Promise<void> {
  try {
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connection established successfully');
  } catch (error) {
    logger.fatal({ error }, 'Failed to connect to database');
    throw error;
  }
}

/**
 * Gracefully disconnects from the database.
 * Should be called during application shutdown.
 */
async function disconnectDatabase(): Promise<void> {
  try {
    logger.info('Disconnecting from database...');
    await prisma.$disconnect();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error({ error }, 'Error disconnecting from database');
    throw error;
  }
}

export { prisma, connectDatabase, disconnectDatabase };
