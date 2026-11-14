import { AuditLog } from '@prisma/client';
import { prisma } from '../client.js';
import { createModuleLogger } from '../../utils/logger.js';

const logger = createModuleLogger('repository:audit');

export interface AuditCreateOptions {
  userId?: string;
  target?: string;
  details?: string;
  module?: string;
  severity?: string;
}

export interface AuditFindFilters {
  limit?: number;
  offset?: number;
  action?: string;
  userId?: string;
  severity?: string;
  after?: Date;
  before?: Date;
}

export class AuditRepository {
  /**
   * Creates a new audit log entry.
   */
  async create(
    guildId: string,
    action: string,
    options: AuditCreateOptions = {},
  ): Promise<AuditLog> {
    try {
      const log = await prisma.auditLog.create({
        data: {
          guildId,
          action,
          userId: options.userId ?? null,
          target: options.target ?? null,
          details: options.details ?? null,
          module: options.module ?? null,
          severity: options.severity ?? 'info',
        },
      });

      logger.debug({ guildId, action }, 'Audit log entry created');
      return log;
    } catch (error) {
      logger.error({ error, guildId, action }, 'Failed to create audit log entry');
      throw error;
    }
  }

  /**
   * Finds audit log entries for a guild with optional filtering and pagination.
   */
  async findByGuild(guildId: string, filters: AuditFindFilters = {}): Promise<AuditLog[]> {
    try {
      const { limit = 50, offset = 0, action, userId, severity, after, before } = filters;

      const where: Record<string, unknown> = { guildId };

      if (action) {
        where.action = action;
      }

      if (userId) {
        where.userId = userId;
      }

      if (severity) {
        where.severity = severity;
      }

      if (after || before) {
        const createdAt: Record<string, Date> = {};
        if (after) createdAt.gte = after;
        if (before) createdAt.lte = before;
        where.createdAt = createdAt;
      }

      return await prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });
    } catch (error) {
      logger.error({ error, guildId }, 'Failed to find audit logs');
      throw error;
    }
  }

  /**
   * Counts audit log entries for a specific action in a guild, optionally since a given date.
   */
  async countByAction(guildId: string, action: string, since?: Date): Promise<number> {
    try {
      const where: Record<string, unknown> = { guildId, action };

      if (since) {
        where.createdAt = { gte: since };
      }

      return await prisma.auditLog.count({ where });
    } catch (error) {
      logger.error({ error, guildId, action }, 'Failed to count audit logs by action');
      throw error;
    }
  }

  /**
   * Deletes audit log entries older than the specified date.
   * Returns the number of deleted entries.
   */
  async cleanup(olderThan: Date): Promise<number> {
    try {
      const result = await prisma.auditLog.deleteMany({
        where: {
          createdAt: { lt: olderThan },
        },
      });

      logger.info({ deletedCount: result.count, olderThan }, 'Audit log cleanup completed');
      return result.count;
    } catch (error) {
      logger.error({ error, olderThan }, 'Failed to cleanup audit logs');
      throw error;
    }
  }
}
