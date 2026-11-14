/**
/**
 * Analytics Service for NEXUS AI.
 * Computes multi-day community metrics, velocity, retention, anomaly detection,
 * and hardware/system telemetry for the HP All-in-One host (4GB RAM) and dashboard.
 */
export interface ActivitySummary {
    guildId: string;
    totalMembers: number;
    activeLast24h: number;
    activeLast7d: number;
    totalMessages: number;
    totalVoiceMinutes: number;
    totalVoiceHours: number;
    averageMessagesPerActiveMember: number;
    engagementScore: number;
    topChatters: Array<{
        userId: string;
        username: string;
        messageCount: number;
        level: number;
    }>;
    topVoiceUsers: Array<{
        userId: string;
        username: string;
        voiceMinutes: number;
        level: number;
    }>;
}
export interface AnomalyReport {
    isAnomaly: boolean;
    metric: string;
    currentValue: number;
    movingAverage: number;
    deviationPercent: number;
    type: "spike" | "drop";
    severity: "info" | "warning" | "alert";
    details: string;
}
export interface RetentionVelocityResult {
    guildId: string;
    periodDays: number;
    totalJoins: number;
    totalLeaves: number;
    netGrowth: number;
    movingAverages: {
        dailyMessages: number;
        dailyVoiceMinutes: number;
        dailyJoins: number;
    };
    anomalies: AnomalyReport[];
}
export interface SystemTelemetry {
    botVersion: string;
    process: {
        pid: number;
        uptimeSeconds: number;
        uptimeFormatted: string;
        nodeVersion: string;
        memory: {
            rssMb: number;
            heapUsedMb: number;
            heapTotalMb: number;
            externalMb: number;
        };
    };
    system: {
        hostname: string;
        platform: string;
        osType: string;
        osRelease: string;
        arch: string;
        cpuModel: string;
        cpuCores: number;
        totalRamMb: number;
        freeRamMb: number;
        usedRamMb: number;
        ramUsagePercent: number;
    };
    database: {
        engine: "SQLite (WAL mode)";
        dbPath: string;
        dbSizeMb: number;
        walSizeMb: number;
        totalDbSizeMb: number;
    };
    timestamp: string;
}
export declare class AnalyticsService {
    /**
     * Returns today's date formatted as YYYY-MM-DD.
     */
    getTodayDateString(): string;
    /**
     * Records or updates a daily metric snapshot in the database.
     */
    recordDailySnapshot(guildId: string, data?: {
        date?: string;
        messages?: number;
        voiceMinutes?: number;
        activeMembers?: number;
        joins?: number;
        leaves?: number;
        infractions?: number;
        ticketsOpened?: number;
        ticketsClosed?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        voiceMinutes: number;
        messageCount: number;
        date: string;
        activeMembers: number;
        joins: number;
        leaves: number;
        infractions: number;
        ticketsOpened: number;
        ticketsClosed: number;
    }>;
    /**
     * Retrieves historical metrics for a given guild over N days.
     */
    getHistoricalMetrics(guildId: string, days?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        voiceMinutes: number;
        messageCount: number;
        date: string;
        activeMembers: number;
        joins: number;
        leaves: number;
        infractions: number;
        ticketsOpened: number;
        ticketsClosed: number;
    }[]>;
    /**
     * Computes high-level community activity summary for a guild.
     */
    getActivitySummary(guildId: string): Promise<ActivitySummary>;
    /**
     * Calculates retention, velocity, 7-day moving averages, and flags activity anomalies.
     */
    getRetentionAndVelocity(guildId: string, periodDays?: number): Promise<RetentionVelocityResult>;
    /**
     * Gathers live hardware and process telemetry for the host (HP All-in-One 4GB RAM monitor).
     */
    getSystemTelemetry(): Promise<SystemTelemetry>;
    /**
     * Generates a complete JSON export of community analytics and health metrics.
     */
    exportAnalyticsJson(guildId: string): Promise<object>;
}
export declare const analyticsService: AnalyticsService;
