import { AuditLog } from '@prisma/client';
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
export declare class AuditRepository {
    /**
     * Creates a new audit log entry.
     */
    create(guildId: string, action: string, options?: AuditCreateOptions): Promise<AuditLog>;
    /**
     * Finds audit log entries for a guild with optional filtering and pagination.
     */
    findByGuild(guildId: string, filters?: AuditFindFilters): Promise<AuditLog[]>;
    /**
     * Counts audit log entries for a specific action in a guild, optionally since a given date.
     */
    countByAction(guildId: string, action: string, since?: Date): Promise<number>;
    /**
     * Deletes audit log entries older than the specified date.
     * Returns the number of deleted entries.
     */
    cleanup(olderThan: Date): Promise<number>;
}
