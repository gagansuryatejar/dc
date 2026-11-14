import { createRequire } from 'node:module';
import { createModuleLogger } from '../utils/logger.js';

const require = createRequire(import.meta.url);
const prismaPkg = require('@prisma/client');
const PrismaClientConstructor = prismaPkg.PrismaClient ?? prismaPkg.default?.PrismaClient ?? prismaPkg;
const logger = createModuleLogger('database');

let prisma;

/**
 * Returns the singleton PrismaClient instance.
 * Creates a new instance if one does not exist.
 */
function getPrismaClient() {
    if (!prisma) {
        prisma = new PrismaClientConstructor({
            log: [
                { level: 'error', emit: 'event' },
                { level: 'warn', emit: 'event' },
            ],
        });
        prisma.$on('error', (e) => {
            logger.error({ error: e }, 'Prisma client error');
        });
        prisma.$on('warn', (e) => {
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
async function connectDatabase() {
    try {
        logger.info('Connecting to database...');
        await prisma.$connect();
        logger.info('Database connection established successfully');
        try {
            await prisma.$executeRawUnsafe('PRAGMA journal_mode = WAL;');
            await prisma.$executeRawUnsafe('PRAGMA synchronous = NORMAL;');
            await prisma.$executeRawUnsafe('PRAGMA cache_size = -64000;');
            await prisma.$executeRawUnsafe('PRAGMA temp_store = MEMORY;');
            await prisma.$executeRawUnsafe('PRAGMA mmap_size = 268435456;');
            logger.info('SQLite performance PRAGMAs initialized (WAL mode, 64MB cache, memory temp store)');
        } catch {
            // Ignored if unsupported
        }
    }
    catch (error) {
        logger.fatal({ error }, 'Failed to connect to database');
        throw error;
    }
}

/**
 * Gracefully disconnects from the database.
 * Should be called during application shutdown.
 */
async function disconnectDatabase() {
    try {
        logger.info('Disconnecting from database...');
        await prisma.$disconnect();
        logger.info('Database disconnected successfully');
    }
    catch (error) {
        logger.error({ error }, 'Error disconnecting from database');
        throw error;
    }
}

export { prisma, connectDatabase, disconnectDatabase };
//# sourceMappingURL=client.js.map