import { PrismaClient } from '@prisma/client';
import { createModuleLogger } from '../utils/logger.js';
const logger = createModuleLogger('database');
let prisma;
/**
 * Returns the singleton PrismaClient instance.
 * Creates a new instance if one does not exist.
 */
function getPrismaClient() {
    if (!prisma) {
        prisma = new PrismaClient({
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