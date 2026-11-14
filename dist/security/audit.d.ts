/**
 * Audit logging service for NEXUS AI.
 */
export declare enum AuditAction {
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
    BACKUP_CREATED = "BACKUP_CREATED"
}
export declare class AuditService {
    /**
     * Log an administrative or system action.
     */
    log(guildId: string, action: AuditAction | string, options?: {
        userId?: string;
        target?: string;
        details?: Record<string, unknown> | string;
        module?: string;
        severity?: "info" | "warn" | "error" | "critical";
    }): Promise<void>;
}
export declare const auditService: AuditService;
