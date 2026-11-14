/**
 * Punishment & Infraction Management Engine for NEXUS AI.
 * Handles progressive warning escalation, timeouts, kicks, bans,
 * pardoning workflows, and persistent infraction logs.
 */
import { prisma, auditRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("moderation:punishment");
export class PunishmentService {
    /**
     * Evaluates punishment escalation based on cumulative active warnings.
     * Escalation ladder:
     * 1 warning: Notice / Formal warning
     * 2 warnings: 10-minute timeout
     * 3 warnings: 60-minute timeout
     * 4+ warnings: 1440-minute (24h) timeout / Kick review
     */
    evaluateEscalation(activeWarnings) {
        if (activeWarnings === 1) {
            return { action: "warn", warningsCount: activeWarnings };
        }
        if (activeWarnings === 2) {
            return { action: "timeout", durationMinutes: 10, warningsCount: activeWarnings };
        }
        if (activeWarnings === 3) {
            return { action: "timeout", durationMinutes: 60, warningsCount: activeWarnings };
        }
        if (activeWarnings >= 4) {
            return { action: "timeout", durationMinutes: 1440, warningsCount: activeWarnings };
        }
        return { action: "none", warningsCount: activeWarnings };
    }
    /**
     * Records an infraction (warn, timeout, kick, ban) and updates member warning count.
     */
    async recordInfraction(guildId, userId, moderatorId, type, reason, durationMinutes) {
        const infraction = await prisma.infraction.create({
            data: {
                guildId,
                userId,
                moderatorId,
                type,
                reason,
                durationMinutes: durationMinutes ?? null,
                active: true,
            },
        });
        // Update member warnings count if infraction is a warning
        let activeWarnings = 1;
        if (type === "warn") {
            const activeCount = await prisma.infraction.count({
                where: { guildId, userId, type: "warn", active: true },
            });
            activeWarnings = activeCount;
            await prisma.guildMember.updateMany({
                where: { guildId, userId },
                data: { warnings: activeCount },
            });
        }
        const escalation = this.evaluateEscalation(activeWarnings);
        await auditRepository.create(guildId, `PUNISHMENT_${type.toUpperCase()}`, {
            userId,
            target: userId,
            details: `Reason: ${reason}${durationMinutes ? ` (${durationMinutes}m)` : ""}`,
            module: "moderation",
            severity: type === "ban" || type === "kick" ? "critical" : "warning",
        });
        logger.info({ guildId, userId, type, activeWarnings }, "Infraction recorded");
        return { infraction, escalation };
    }
    /**
     * Applies a Discord timeout to a guild member.
     */
    async applyTimeout(member, durationMinutes, reason, moderatorId) {
        const durationMs = durationMinutes * 60 * 1000;
        await member.timeout(durationMs, `[NEXUS Mod] ${reason}`);
        await this.recordInfraction(member.guild.id, member.id, moderatorId, "timeout", reason, durationMinutes);
    }
    /**
     * Removes an existing timeout from a member.
     */
    async removeTimeout(member, reason, moderatorId) {
        await member.timeout(null, `[NEXUS Mod Untimeout] ${reason}`);
        await auditRepository.create(member.guild.id, "MOD_UNTIMEOUT", {
            userId: member.id,
            target: member.id,
            details: `Removed timeout. Reason: ${reason} (by ${moderatorId})`,
            module: "moderation",
            severity: "info",
        });
    }
    /**
     * Kicks a member from the guild.
     */
    async kickMember(member, reason, moderatorId) {
        await this.recordInfraction(member.guild.id, member.id, moderatorId, "kick", reason);
        await member.kick(`[NEXUS Mod Kick] ${reason}`);
    }
    /**
     * Bans a user from the guild.
     */
    async banUser(guild, userId, reason, moderatorId, deleteMessageDays = 0) {
        await this.recordInfraction(guild.id, userId, moderatorId, "ban", reason);
        await guild.members.ban(userId, {
            reason: `[NEXUS Mod Ban] ${reason}`,
            deleteMessageSeconds: Math.min(7, deleteMessageDays) * 86400,
        });
    }
    /**
     * Unbans a user from the guild.
     */
    async unbanUser(guild, userId, reason, moderatorId) {
        await guild.members.unban(userId, `[NEXUS Mod Unban] ${reason}`);
        await auditRepository.create(guild.id, "MOD_UNBAN", {
            userId,
            target: userId,
            details: `Unbanned user. Reason: ${reason} (by ${moderatorId})`,
            module: "moderation",
            severity: "info",
        });
    }
    /**
     * Fetches infraction history for a specific member.
     */
    async getHistory(guildId, userId) {
        return prisma.infraction.findMany({
            where: { guildId, userId },
            orderBy: { createdAt: "desc" },
        });
    }
    /**
     * Pardons a previous warning infraction, removing it from active penalty calculation.
     */
    async pardonInfraction(guildId, infractionId, moderatorId) {
        try {
            const existing = await prisma.infraction.findUnique({
                where: { id: infractionId },
            });
            if (!existing || existing.guildId !== guildId) {
                return false;
            }
            await prisma.infraction.update({
                where: { id: infractionId },
                data: { active: false },
            });
            // Recalculate remaining active warnings
            const remainingCount = await prisma.infraction.count({
                where: { guildId, userId: existing.userId, type: "warn", active: true },
            });
            await prisma.guildMember.updateMany({
                where: { guildId, userId: existing.userId },
                data: { warnings: remainingCount },
            });
            await auditRepository.create(guildId, "MOD_PARDON", {
                userId: existing.userId,
                target: existing.userId,
                details: `Pardoned infraction ${infractionId} (Type: ${existing.type}) by ${moderatorId}`,
                module: "moderation",
                severity: "info",
            });
            return true;
        }
        catch {
            return false;
        }
    }
}
export const punishmentService = new PunishmentService();
//# sourceMappingURL=punishment.service.js.map