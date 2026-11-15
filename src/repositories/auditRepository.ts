/**
 * AuditRepository — Immutable audit log for administrative & system actions.
 * Every guild maintains its own audit trail (no cross-guild leakage).
 */

import { prisma } from "../database/client.js";
import { logger } from "../utils/logger.js";

export type AuditInput = {
  guildId: string;
  userId?: string;
  action: string;
  target?: string;
  details?: Record<string, unknown>;
  module?: string;
  severity?: "info" | "warn" | "error" | "critical";
};

export const auditRepository = {
  async create(input: AuditInput) {
    return prisma.auditLog.create({
      data: {
        guildId: input.guildId,
        userId: input.userId ?? null,
        action: input.action,
        target: input.target ?? null,
        details: input.details ? JSON.stringify(input.details) : null,
        module: input.module ?? null,
        severity: input.severity ?? "info",
      },
    });
  },

  async findByGuild(guildId: string, options?: { limit?: number; userId?: string }) {
    return prisma.auditLog.findMany({
      where: {
        guildId,
        ...(options?.userId ? { userId: options.userId } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: options?.limit ?? 50,
    });
  },

  async countByAction(guildId: string, action: string) {
    return prisma.auditLog.count({ where: { guildId, action } });
  },
};

logger.debug({ module: "auditRepository" }, "AuditRepository initialised");
