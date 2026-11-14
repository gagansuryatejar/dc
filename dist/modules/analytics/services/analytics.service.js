/**
/**
 * Analytics Service for NEXUS AI.
 * Computes multi-day community metrics, velocity, retention, anomaly detection,
 * and hardware/system telemetry for the HP All-in-One host (4GB RAM) and dashboard.
 */
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { BOT_VERSION } from "../../../utils/constants.js";
const logger = createModuleLogger("service:analytics");
export class AnalyticsService {
    /**
     * Returns today's date formatted as YYYY-MM-DD.
     */
    getTodayDateString() {
        return new Date().toISOString().split("T")[0];
    }
    /**
     * Records or updates a daily metric snapshot in the database.
     */
    async recordDailySnapshot(guildId, data = {}) {
        const targetDate = data.date || this.getTodayDateString();
        try {
            const metric = await prisma.dailyMetric.upsert({
                where: {
                    guildId_date: {
                        guildId,
                        date: targetDate,
                    },
                },
                create: {
                    guildId,
                    date: targetDate,
                    messageCount: data.messages ?? 0,
                    voiceMinutes: data.voiceMinutes ?? 0,
                    activeMembers: data.activeMembers ?? 0,
                    joins: data.joins ?? 0,
                    leaves: data.leaves ?? 0,
                    infractions: data.infractions ?? 0,
                    ticketsOpened: data.ticketsOpened ?? 0,
                    ticketsClosed: data.ticketsClosed ?? 0,
                },
                update: {
                    messageCount: data.messages !== undefined ? { increment: data.messages } : undefined,
                    voiceMinutes: data.voiceMinutes !== undefined ? { increment: data.voiceMinutes } : undefined,
                    activeMembers: data.activeMembers !== undefined ? data.activeMembers : undefined,
                    joins: data.joins !== undefined ? { increment: data.joins } : undefined,
                    leaves: data.leaves !== undefined ? { increment: data.leaves } : undefined,
                    infractions: data.infractions !== undefined ? { increment: data.infractions } : undefined,
                    ticketsOpened: data.ticketsOpened !== undefined ? { increment: data.ticketsOpened } : undefined,
                    ticketsClosed: data.ticketsClosed !== undefined ? { increment: data.ticketsClosed } : undefined,
                },
            });
            return metric;
        }
        catch (error) {
            logger.error({ error, guildId, date: targetDate }, "Failed to record daily snapshot");
            throw error;
        }
    }
    /**
     * Retrieves historical metrics for a given guild over N days.
     */
    async getHistoricalMetrics(guildId, days = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffDateStr = cutoffDate.toISOString().split("T")[0];
        const records = await prisma.dailyMetric.findMany({
            where: {
                guildId,
                date: { gte: cutoffDateStr },
            },
            orderBy: { date: "asc" },
        });
        return records;
    }
    /**
     * Computes high-level community activity summary for a guild.
     */
    async getActivitySummary(guildId) {
        const now = new Date();
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const [totalMembers, activeLast24h, activeLast7d, membersAgg, topChatters, topVoiceUsers] = await Promise.all([
            prisma.guildMember.count({ where: { guildId } }),
            prisma.guildMember.count({
                where: {
                    guildId,
                    lastActive: { gte: oneDayAgo },
                },
            }),
            prisma.guildMember.count({
                where: {
                    guildId,
                    lastActive: { gte: sevenDaysAgo },
                },
            }),
            prisma.guildMember.aggregate({
                where: { guildId },
                _sum: {
                    messageCount: true,
                    voiceMinutes: true,
                },
            }),
            prisma.guildMember.findMany({
                where: { guildId },
                orderBy: { messageCount: "desc" },
                take: 5,
                select: { userId: true, username: true, messageCount: true, level: true },
            }),
            prisma.guildMember.findMany({
                where: { guildId },
                orderBy: { voiceMinutes: "desc" },
                take: 5,
                select: { userId: true, username: true, voiceMinutes: true, level: true },
            }),
        ]);
        const totalMessages = membersAgg._sum.messageCount ?? 0;
        const totalVoiceMinutes = membersAgg._sum.voiceMinutes ?? 0;
        const totalVoiceHours = Math.round((totalVoiceMinutes / 60) * 10) / 10;
        const averageMessages = activeLast7d > 0 ? Math.round((totalMessages / activeLast7d) * 10) / 10 : 0;
        // Composite Engagement Score (0 - 100):
        // 40% from 7-day active user percentage
        // 30% from message volume per active member (capped at 50 msgs = 100%)
        // 30% from voice hours per active member (capped at 5 hrs = 100%)
        const activeRate = totalMembers > 0 ? (activeLast7d / totalMembers) : 0;
        const msgFactor = Math.min(1, averageMessages / 50);
        const voiceHoursPerMember = activeLast7d > 0 ? (totalVoiceHours / activeLast7d) : 0;
        const voiceFactor = Math.min(1, voiceHoursPerMember / 5);
        const engagementScore = Math.min(100, Math.round((activeRate * 40 + msgFactor * 30 + voiceFactor * 30) * 100) / 100);
        return {
            guildId,
            totalMembers,
            activeLast24h,
            activeLast7d,
            totalMessages,
            totalVoiceMinutes,
            totalVoiceHours,
            averageMessagesPerActiveMember: averageMessages,
            engagementScore,
            topChatters,
            topVoiceUsers,
        };
    }
    /**
     * Calculates retention, velocity, 7-day moving averages, and flags activity anomalies.
     */
    async getRetentionAndVelocity(guildId, periodDays = 7) {
        const historical = await this.getHistoricalMetrics(guildId, periodDays);
        let totalJoins = 0;
        let totalLeaves = 0;
        let sumMessages = 0;
        let sumVoice = 0;
        let sumJoins = 0;
        for (const day of historical) {
            totalJoins += day.joins;
            totalLeaves += day.leaves;
            sumMessages += day.messageCount;
            sumVoice += day.voiceMinutes;
            sumJoins += day.joins;
        }
        const count = Math.max(1, historical.length);
        const avgMessages = Math.round(sumMessages / count);
        const avgVoice = Math.round(sumVoice / count);
        const avgJoins = Math.round((sumJoins / count) * 10) / 10;
        const anomalies = [];
        // Find today's metric (or last available entry)
        const todayStr = this.getTodayDateString();
        const todayMetric = historical.find((h) => h.date === todayStr) || historical[historical.length - 1];
        if (todayMetric && count >= 2) {
            // 1. Message spike/drop anomaly (> 50% deviation)
            if (avgMessages > 20) {
                const diffMsgs = todayMetric.messageCount - avgMessages;
                const devPercent = Math.round((diffMsgs / avgMessages) * 100);
                if (devPercent >= 50) {
                    anomalies.push({
                        isAnomaly: true,
                        metric: "messageCount",
                        currentValue: todayMetric.messageCount,
                        movingAverage: avgMessages,
                        deviationPercent: devPercent,
                        type: "spike",
                        severity: devPercent >= 100 ? "warning" : "info",
                        details: `Chat activity is ${devPercent}% above the 7-day average.`,
                    });
                }
                else if (devPercent <= -50) {
                    anomalies.push({
                        isAnomaly: true,
                        metric: "messageCount",
                        currentValue: todayMetric.messageCount,
                        movingAverage: avgMessages,
                        deviationPercent: devPercent,
                        type: "drop",
                        severity: "info",
                        details: `Chat activity is ${Math.abs(devPercent)}% below typical velocity.`,
                    });
                }
            }
            // 2. Member join spike anomaly (potential raid alert)
            if (todayMetric.joins >= 5 && avgJoins > 0) {
                const joinDev = Math.round(((todayMetric.joins - avgJoins) / avgJoins) * 100);
                if (joinDev >= 100) {
                    anomalies.push({
                        isAnomaly: true,
                        metric: "joins",
                        currentValue: todayMetric.joins,
                        movingAverage: avgJoins,
                        deviationPercent: joinDev,
                        type: "spike",
                        severity: todayMetric.joins >= 10 ? "alert" : "warning",
                        details: `Unusual join velocity: ${todayMetric.joins} joins today (+${joinDev}% over average). Anti-raid monitoring advised.`,
                    });
                }
            }
            // 3. Infraction spike anomaly (spike in warns/bans)
            if (todayMetric.infractions >= 3) {
                anomalies.push({
                    isAnomaly: true,
                    metric: "infractions",
                    currentValue: todayMetric.infractions,
                    movingAverage: 0,
                    deviationPercent: 100,
                    type: "spike",
                    severity: "warning",
                    details: `Spike in moderation infractions: ${todayMetric.infractions} penalties recorded today.`,
                });
            }
        }
        return {
            guildId,
            periodDays,
            totalJoins,
            totalLeaves,
            netGrowth: totalJoins - totalLeaves,
            movingAverages: {
                dailyMessages: avgMessages,
                dailyVoiceMinutes: avgVoice,
                dailyJoins: avgJoins,
            },
            anomalies,
        };
    }
    /**
     * Gathers live hardware and process telemetry for the host (HP All-in-One 4GB RAM monitor).
     */
    async getSystemTelemetry() {
        const mem = process.memoryUsage();
        const totalRam = os.totalmem();
        const freeRam = os.freemem();
        const usedRam = totalRam - freeRam;
        // Database file size calculation
        const dbPath = path.resolve(process.cwd(), "data/nexus.db");
        const walPath = path.resolve(process.cwd(), "data/nexus.db-wal");
        let dbSizeMb = 0;
        let walSizeMb = 0;
        try {
            if (fs.existsSync(dbPath)) {
                const stat = fs.statSync(dbPath);
                dbSizeMb = Math.round((stat.size / (1024 * 1024)) * 100) / 100;
            }
            if (fs.existsSync(walPath)) {
                const walStat = fs.statSync(walPath);
                walSizeMb = Math.round((walStat.size / (1024 * 1024)) * 100) / 100;
            }
        }
        catch {
            // Ignored if permissions or locked
        }
        const uptimeSeconds = Math.floor(process.uptime());
        const hours = Math.floor(uptimeSeconds / 3600);
        const mins = Math.floor((uptimeSeconds % 3600) / 60);
        const secs = uptimeSeconds % 60;
        const uptimeFormatted = `${hours}h ${mins}m ${secs}s`;
        return {
            botVersion: BOT_VERSION,
            process: {
                pid: process.pid,
                uptimeSeconds,
                uptimeFormatted,
                nodeVersion: process.version,
                memory: {
                    rssMb: Math.round((mem.rss / (1024 * 1024)) * 100) / 100,
                    heapUsedMb: Math.round((mem.heapUsed / (1024 * 1024)) * 100) / 100,
                    heapTotalMb: Math.round((mem.heapTotal / (1024 * 1024)) * 100) / 100,
                    externalMb: Math.round((mem.external / (1024 * 1024)) * 100) / 100,
                },
            },
            system: {
                hostname: os.hostname(),
                platform: os.platform(),
                osType: os.type(),
                osRelease: os.release(),
                arch: os.arch(),
                cpuModel: os.cpus()[0]?.model || "Intel / AMD Architecture",
                cpuCores: os.cpus().length,
                totalRamMb: Math.round(totalRam / (1024 * 1024)),
                freeRamMb: Math.round(freeRam / (1024 * 1024)),
                usedRamMb: Math.round(usedRam / (1024 * 1024)),
                ramUsagePercent: Math.round((usedRam / totalRam) * 100),
            },
            database: {
                engine: "SQLite (WAL mode)",
                dbPath,
                dbSizeMb,
                walSizeMb,
                totalDbSizeMb: Math.round((dbSizeMb + walSizeMb) * 100) / 100,
            },
            timestamp: new Date().toISOString(),
        };
    }
    /**
     * Generates a complete JSON export of community analytics and health metrics.
     */
    async exportAnalyticsJson(guildId) {
        const [guild, summary, velocity, historical, telemetry, ticketCounts, infractionCounts] = await Promise.all([
            prisma.guild.findUnique({ where: { id: guildId } }),
            this.getActivitySummary(guildId),
            this.getRetentionAndVelocity(guildId, 30),
            this.getHistoricalMetrics(guildId, 30),
            this.getSystemTelemetry(),
            prisma.supportTicket.groupBy({
                by: ["status"],
                where: { guildId },
                _count: { _all: true },
            }),
            prisma.infraction.groupBy({
                by: ["type"],
                where: { guildId },
                _count: { _all: true },
            }),
        ]);
        return {
            nexusVersion: BOT_VERSION,
            exportedAt: new Date().toISOString(),
            guild: {
                id: guildId,
                name: guild?.name ?? "Unknown Guild",
                createdAt: guild?.createdAt,
            },
            summary,
            velocity,
            history30d: historical,
            ticketSummary: ticketCounts,
            infractionSummary: infractionCounts,
            systemTelemetry: telemetry,
        };
    }
}
export const analyticsService = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map