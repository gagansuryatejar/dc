/**
 * Audit logging service for NEXUS AI.
 */

import { auditRepository } from "../database/index.js";
import { createModuleLogger } from "../utils/logger.js";

const logger = createModuleLogger("security:audit");

export enum AuditAction {
  BOT_STARTUP = "BOT_STARTUP",
  BOT_SHUTDOWN = "BOT_SHUTDOWN",
  MODULE_ENABLE = "MODULE_ENABLE",
  MODULE_DISABLE = "MODULE_DISABLE",
  SETTINGS_UPDATE = "SETTINGS_UPDATE",
  ADMIN_COMMAND = "ADMIN_COMMAND",
  MODERATION_WARN = "MODERATION_WARN",
  MODERATION_TIMEOUT = "MODERATION_TIMEOUT",
  MODERATION_KICK = "MODERATION_KICK",
  MODERATION_BAN = "MODERATION_BAN",
  SECURITY_VIOLATION = "SECURITY_VIOLATION",
  BACKUP_CREATED = "BACKUP_CREATED",
}

export class AuditService {
  /**
   * Log an administrative or system action.
   */
  async log(
    guildId: string,
    action: AuditAction | string,
    options: {
      userId?: string;
      target?: string;
      details?: Record<string, unknown> | string;
      module?: string;
      severity?: "info" | "warn" | "error" | "critical";
    } = {},
  ): Promise<void> {
    try {
      const detailsStr =
        typeof options.details === "object"
          ? JSON.stringify(options.details)
          : options.details;

      await auditRepository.create(guildId, action, {
        userId: options.userId,
        target: options.target,
        details: detailsStr,
        module: options.module ?? "core",
        severity: options.severity ?? "info",
      });
    } catch (error) {
      logger.error({ error, guildId, action }, "Failed to record audit log");
    }
  }
}

export const auditService = new AuditService();
