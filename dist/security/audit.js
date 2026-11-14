/**
 * Audit logging service for NEXUS AI.
 */
import { auditRepository } from "../database/index.js";
import { createModuleLogger } from "../utils/logger.js";
const logger = createModuleLogger("security:audit");
export var AuditAction;
(function (AuditAction) {
    AuditAction["BOT_STARTUP"] = "BOT_STARTUP";
    AuditAction["BOT_SHUTDOWN"] = "BOT_SHUTDOWN";
    AuditAction["MODULE_ENABLE"] = "MODULE_ENABLE";
    AuditAction["MODULE_DISABLE"] = "MODULE_DISABLE";
    AuditAction["SETTINGS_UPDATE"] = "SETTINGS_UPDATE";
    AuditAction["ADMIN_COMMAND"] = "ADMIN_COMMAND";
    AuditAction["MODERATION_WARN"] = "MODERATION_WARN";
    AuditAction["MODERATION_TIMEOUT"] = "MODERATION_TIMEOUT";
    AuditAction["MODERATION_KICK"] = "MODERATION_KICK";
    AuditAction["MODERATION_BAN"] = "MODERATION_BAN";
    AuditAction["SECURITY_VIOLATION"] = "SECURITY_VIOLATION";
    AuditAction["BACKUP_CREATED"] = "BACKUP_CREATED";
})(AuditAction || (AuditAction = {}));
export class AuditService {
    /**
     * Log an administrative or system action.
     */
    async log(guildId, action, options = {}) {
        try {
            const detailsStr = typeof options.details === "object"
                ? JSON.stringify(options.details)
                : options.details;
            await auditRepository.create(guildId, action, {
                userId: options.userId,
                target: options.target,
                details: detailsStr,
                module: options.module ?? "core",
                severity: options.severity ?? "info",
            });
        }
        catch (error) {
            logger.error({ error, guildId, action }, "Failed to record audit log");
        }
    }
}
export const auditService = new AuditService();
//# sourceMappingURL=audit.js.map