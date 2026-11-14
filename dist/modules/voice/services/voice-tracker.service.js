/**
 * Voice activity and duration tracking engine for NEXUS AI.
 * Tracks member voice presence, awards voice XP, and celebrates voice milestones.
 */
import { EmbedBuilder } from "discord.js";
import { memberRepository, guildRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
const logger = createModuleLogger("voice:tracker");
export const VOICE_MILESTONES = [
    {
        minutes: 30,
        badgeId: "voice_30m",
        name: "Voice Explorer",
        rewardXp: 100,
        rewardCoins: 50,
        emoji: "🎙️",
    },
    {
        minutes: 60,
        badgeId: "voice_1h",
        name: "Voice Regular",
        rewardXp: 200,
        rewardCoins: 100,
        emoji: "🎧",
    },
    {
        minutes: 180,
        badgeId: "voice_3h",
        name: "Voice Champion",
        rewardXp: 500,
        rewardCoins: 250,
        emoji: "📻",
    },
    {
        minutes: 300,
        badgeId: "voice_5h",
        name: "Community Legend",
        rewardXp: 1000,
        rewardCoins: 500,
        emoji: "👑",
    },
];
export class VoiceTrackerService {
    /** Active voice sessions keyed by "guildId:userId" */
    sessions = new Map();
    syncTimer;
    constructor() {
        // Periodic synchronization every 5 minutes to prevent data loss on unexpected host reboot
        this.syncTimer = setInterval(() => this.syncActiveSessions(), 5 * 60 * 1000);
        if (this.syncTimer.unref)
            this.syncTimer.unref();
    }
    getKey(guildId, userId) {
        return `${guildId}:${userId}`;
    }
    /**
     * Called when a member joins a voice channel.
     */
    async onMemberJoin(guildId, userId, username, channelId) {
        const key = this.getKey(guildId, userId);
        this.sessions.set(key, {
            guildId,
            userId,
            channelId,
            joinedAt: Date.now(),
        });
        await memberRepository.findOrCreate(guildId, userId, username);
        logger.debug({ guildId, userId, channelId }, "Recorded voice session start");
    }
    /**
     * Called when a member leaves a voice channel or switches channels.
     */
    async onMemberLeave(guildId, userId, _channelId, client) {
        const key = this.getKey(guildId, userId);
        const session = this.sessions.get(key);
        if (!session)
            return null;
        this.sessions.delete(key);
        const now = Date.now();
        const durationMs = now - session.joinedAt;
        const minutesSpent = Math.floor(durationMs / 60_000);
        if (minutesSpent < 1) {
            return { minutesSpent: 0, xpEarned: 0 };
        }
        try {
            const member = await memberRepository.findOrCreate(guildId, userId, "VoiceUser");
            const updatedTotalMinutes = member.voiceMinutes + minutesSpent;
            // 1 XP per minute of voice participation
            const xpEarned = minutesSpent;
            const updatedXp = member.xp + xpEarned;
            // Check milestones
            let badgesArray = [];
            try {
                badgesArray = JSON.parse(member.badges || "[]");
            }
            catch {
                badgesArray = [];
            }
            let bonusXp = 0;
            let bonusCoins = 0;
            const celebratedMilestones = [];
            for (const milestone of VOICE_MILESTONES) {
                if (updatedTotalMinutes >= milestone.minutes && !badgesArray.includes(milestone.badgeId)) {
                    badgesArray.push(milestone.badgeId);
                    celebratedMilestones.push(milestone);
                    bonusXp += milestone.rewardXp;
                    bonusCoins += milestone.rewardCoins;
                }
            }
            await memberRepository.update(guildId, userId, {
                voiceMinutes: updatedTotalMinutes,
                xp: updatedXp + bonusXp,
                coins: member.coins + bonusCoins,
                badges: JSON.stringify(badgesArray),
                lastActive: new Date(),
            });
            logger.info({ guildId, userId, minutesSpent, updatedTotalMinutes }, "Processed voice session completion");
            // Celebrate newly unlocked milestones in text channel
            if (celebratedMilestones.length > 0) {
                await this.announceMilestones(guildId, userId, celebratedMilestones, updatedTotalMinutes, client);
            }
            return { minutesSpent, xpEarned: xpEarned + bonusXp };
        }
        catch (error) {
            logger.error({ error, guildId, userId }, "Error updating voice activity records");
            return null;
        }
    }
    /**
     * Broadcast milestone achievement cards in guild announcement or welcome channels.
     */
    async announceMilestones(guildId, userId, milestones, totalMinutes, client) {
        try {
            const guild = client.guilds.cache.get(guildId);
            if (!guild)
                return;
            const guildData = await guildRepository.findById(guildId);
            const targetChannelId = guildData?.announcementChannel || guildData?.welcomeChannel;
            const targetChannel = targetChannelId ? guild.channels.cache.get(targetChannelId) : null;
            if (!targetChannel || !targetChannel.isTextBased())
                return;
            for (const m of milestones) {
                const hours = (totalMinutes / 60).toFixed(1);
                const embed = new EmbedBuilder()
                    .setColor(Colors.SUCCESS)
                    .setTitle(`${m.emoji} Voice Milestone Achieved: ${m.name}!`)
                    .setDescription(`🎙️ <@${userId}> has achieved the **${m.name}** milestone with **${hours} hours** of community voice participation!\n\n` +
                    `🎁 **Milestone Rewards:** **+${m.rewardXp} XP** • **+${m.rewardCoins} Virtual Coins** • ${m.emoji} Badge Unlocked!`)
                    .setFooter({ text: FOOTER_TEXT })
                    .setTimestamp();
                await targetChannel.send({ embeds: [embed] });
            }
        }
        catch (err) {
            logger.error({ err, guildId, userId }, "Failed to broadcast voice milestone announcement");
        }
    }
    /**
     * Periodically flush active session duration so data isn't lost during unexpected server restarts.
     */
    async syncActiveSessions() {
        const now = Date.now();
        for (const [key, session] of this.sessions.entries()) {
            const elapsedMinutes = Math.floor((now - session.joinedAt) / 60_000);
            if (elapsedMinutes >= 5) {
                try {
                    const member = await memberRepository.findByGuildAndUser(session.guildId, session.userId);
                    if (member) {
                        await memberRepository.update(session.guildId, session.userId, {
                            voiceMinutes: member.voiceMinutes + elapsedMinutes,
                            xp: member.xp + elapsedMinutes,
                            lastActive: new Date(),
                        });
                        // Reset joinedAt to now for next flush
                        session.joinedAt = now;
                    }
                }
                catch (e) {
                    logger.debug({ error: e, key }, "Failed to flush periodic voice activity");
                }
            }
        }
    }
    /**
     * Get active voice session info for a member, if any.
     */
    getActiveSession(guildId, userId) {
        return this.sessions.get(this.getKey(guildId, userId));
    }
    /**
     * Inspect all currently occupied voice channels in a guild.
     */
    getActiveRooms(guild) {
        const rooms = [];
        for (const channel of guild.channels.cache.values()) {
            if (channel.isVoiceBased() && channel.members.size > 0) {
                rooms.push({
                    channelId: channel.id,
                    name: channel.name,
                    memberCount: channel.members.size,
                    members: Array.from(channel.members.values()).map((m) => m.displayName),
                });
            }
        }
        return rooms;
    }
    destroy() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = undefined;
        }
        this.sessions.clear();
    }
}
export const voiceTrackerService = new VoiceTrackerService();
//# sourceMappingURL=voice-tracker.service.js.map