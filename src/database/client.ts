import { createRequire } from 'node:module';
import type { PrismaClient as PrismaClientType } from '@prisma/client';
import { createModuleLogger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
const prismaPkg = require('@prisma/client');
const logger = createModuleLogger('database');

// Resilient constructor supporting CommonJS inside ESM via createRequire
const PrismaClientConstructor =
  prismaPkg.PrismaClient ?? prismaPkg.default?.PrismaClient ?? prismaPkg;

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

    // High-performance PRAGMAs for NVMe SSD & Dedicated RAM
    try {
      await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
      await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
      await prisma.$executeRawUnsafe('PRAGMA cache_size = -64000;'); // 64MB dedicated cache
      await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY;');
      await prisma.$executeRawUnsafe('PRAGMA mmap_size = 268435456;'); // 256MB memory mapped I/O
      logger.info('SQLite performance PRAGMAs initialized (WAL mode, 64MB cache, memory temp store)');
    } catch {
      // Ignored if unsupported
    }
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
