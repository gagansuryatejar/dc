/**
 * Streamer & Content Creator Subsystem for NEXUS AI.
 * Handles streamer profiles, Discord Go Live activity tracking, live roles,
 * airtime statistics, privacy protection, and streamer leaderboards.
 */
import { EmbedBuilder } from "discord.js";
import { prisma, auditRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { sanitizeString, validateUrl } from "../../../security/validators.js";
const logger = createModuleLogger("streamer:service");
export class StreamerService {
    // In-memory tracker for active streaming sessions: `${guildId}:${userId}` -> ActiveStreamSession
    activeStreams = new Map();
    /**
     * Retrieves or initializes a streamer profile.
     */
    async getProfile(guildId, userId) {
        const existing = await prisma.streamerProfile.findUnique({
            where: { guildId_userId: { guildId, userId } },
        });
        if (existing)
            return existing;
        return prisma.streamerProfile.create({
            data: {
                guildId,
                userId,
                notifyGoLive: true,
            },
        });
    }
    /**
     * Updates a member's streamer profile and privacy settings.
     */
    async upsertProfile(guildId, userId, data) {
        const cleanPlatform = data.platform ? sanitizeString(data.platform.toLowerCase(), 32) : undefined;
        const cleanUrl = data.channelUrl && validateUrl(data.channelUrl) ? data.channelUrl : undefined;
        const cleanBio = data.bio ? sanitizeString(data.bio, 300) : undefined;
        const cleanMessage = data.customMessage ? sanitizeString(data.customMessage, 200) : undefined;
        return prisma.streamerProfile.upsert({
            where: { guildId_userId: { guildId, userId } },
            update: {
                platform: cleanPlatform,
                channelUrl: cleanUrl,
                bio: cleanBio,
                notifyGoLive: data.notifyGoLive ?? true,
                customMessage: cleanMessage,
            },
            create: {
                guildId,
                userId,
                platform: cleanPlatform,
                channelUrl: cleanUrl,
                bio: cleanBio,
                notifyGoLive: data.notifyGoLive ?? true,
                customMessage: cleanMessage,
            },
        });
    }
    /**
     * Called when a member starts streaming (Discord Go Live or external stream).
     */
    async onStreamStart(guild, member, details) {
        const key = `${guild.id}:${member.id}`;
        if (this.activeStreams.has(key))
            return; // Already tracking active session
        const profile = await this.getProfile(guild.id, member.id);
        // Streamer Protection: If streamer has opted out of notifications, do not broadcast
        const session = {
            userId: member.id,
            guildId: guild.id,
            startTime: Date.now(),
            streamTitle: details.streamTitle,
            streamUrl: details.streamUrl || profile.channelUrl || undefined,
            gameName: details.gameName,
            platform: details.platform || profile.platform || "Discord Go Live",
        };
        this.activeStreams.set(key, session);
        logger.info({ guildId: guild.id, userId: member.id }, "Stream started");
        if (!profile.notifyGoLive) {
            logger.debug({ guildId: guild.id, userId: member.id }, "Stream notification suppressed by creator preference");
            return;
        }
        // Find guild announcement channel
        const guildData = await prisma.guild.findUnique({ where: { id: guild.id } });
        const channelId = guildData?.announcementChannel;
        if (!channelId)
            return;
        const channel = guild.channels.cache.get(channelId);
        if (!channel)
            return;
        const embed = new EmbedBuilder()
            .setColor(Colors.ACCENT)
            .setTitle(`🔴 LIVE NOW: ${member.displayName} is Streaming!`)
            .setDescription((profile.customMessage ? `*"${profile.customMessage}"*\n\n` : "") +
            `**Title:** ${details.streamTitle || "Community Stream"}\n` +
            `**Activity:** ${details.gameName || "Live Content"}\n` +
            `**Platform:** ${session.platform}\n` +
            (session.streamUrl ? `**Watch:** [Click here to tune in](${session.streamUrl})\n` : "") +
            `\n*Come join and support the broadcast!*`)
            .setThumbnail(member.user.displayAvatarURL({ size: 128 }))
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();
        await channel.send({ embeds: [embed] }).catch(() => null);
    }
    /**
     * Called when a member finishes streaming.
     */
    async onStreamEnd(guild, member) {
        const key = `${guild.id}:${member.id}`;
        const session = this.activeStreams.get(key);
        if (!session)
            return null;
        this.activeStreams.delete(key);
        const durationMinutes = Math.max(1, Math.round((Date.now() - session.startTime) / 60000));
        // Update streamer statistics
        await prisma.streamerProfile.upsert({
            where: { guildId_userId: { guildId: guild.id, userId: member.id } },
            update: {
                totalStreams: { increment: 1 },
                totalStreamMinutes: { increment: durationMinutes },
                lastStreamAt: new Date(),
            },
            create: {
                guildId: guild.id,
                userId: member.id,
                totalStreams: 1,
                totalStreamMinutes: durationMinutes,
                lastStreamAt: new Date(),
            },
        });
        // Award Streamer XP (+2 XP per streamed minute)
        const xpBonus = durationMinutes * 2;
        await prisma.guildMember
            .upsert({
            where: { guildId_userId: { guildId: guild.id, userId: member.id } },
            update: { xp: { increment: xpBonus } },
            create: {
                guildId: guild.id,
                userId: member.id,
                username: member.user?.username || member.displayName || "Streamer",
                displayName: member.displayName,
                xp: xpBonus,
            },
        })
            .catch(() => null);
        await auditRepository.create(guild.id, "STREAM_END", {
            userId: member.id,
            target: member.id,
            details: `Completed stream of ${durationMinutes} mins (+${xpBonus} XP)`,
            module: "streamer",
            severity: "info",
        });
        logger.info({ guildId: guild.id, userId: member.id, durationMinutes }, "Stream session ended");
        return { minutesStreamed: durationMinutes };
    }
    /**
     * Retrieves active stream session if live.
     */
    getActiveSession(guildId, userId) {
        return this.activeStreams.get(`${guildId}:${userId}`);
    }
    /**
     * Retrieves streamer airtime leaderboard for a guild.
     */
    async getLeaderboard(guildId, limit = 10) {
        return prisma.streamerProfile.findMany({
            where: { guildId },
            orderBy: { totalStreamMinutes: "desc" },
            take: limit,
            select: {
                userId: true,
                totalStreamMinutes: true,
                totalStreams: true,
            },
        });
    }
}
export const streamerService = new StreamerService();
//# sourceMappingURL=streamer.service.js.map