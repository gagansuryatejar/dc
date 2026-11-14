/**
 * MessageCreate event handler.
 * Activity tracking, anti-spam XP distribution, level-up celebrations, and badge unlocks.
 */
import { Events, EmbedBuilder } from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { memberRepository } from "../../../database/index.js";
import { levelService } from "../services/level.service.js";
import { achievementService } from "../services/achievement.service.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
const logger = createModuleLogger("event:messageCreate");
export const messageCreateEvent = {
    name: Events.MessageCreate,
    once: false,
    module: ENGAGEMENT,
    async execute(message) {
        // Ignore bots, system messages, and direct messages
        if (message.author.bot || !message.guild || message.system)
            return;
        const guildId = message.guild.id;
        const userId = message.author.id;
        try {
            const member = await memberRepository.findOrCreate(guildId, userId, message.author.username);
            const newMsgCount = member.messageCount + 1;
            // Check anti-spam XP eligibility (max 1 award per 60 seconds)
            const shouldAwardXp = levelService.canEarnMessageXp(userId);
            const earnedXp = shouldAwardXp ? levelService.getRandomMessageXp() : 0;
            const newTotalXp = member.xp + earnedXp;
            const progress = levelService.calculateProgress(newTotalXp);
            const hasLeveledUp = progress.level > member.level;
            // Check achievement badges
            const { newlyUnlocked, updatedBadges } = achievementService.evaluateBadges(member.badges, {
                messageCount: newMsgCount,
                level: progress.level,
                dailyStreak: member.dailyStreak,
                reputation: member.reputation,
                voiceMinutes: member.voiceMinutes,
                hasBirthday: Boolean(member.birthday),
                hasBio: Boolean(member.bio),
            });
            // Update database record
            await memberRepository.update(guildId, userId, {
                messageCount: newMsgCount,
                xp: newTotalXp,
                level: progress.level,
                lastActive: new Date(),
                badges: JSON.stringify(updatedBadges),
            });
            // Announce Level Up if milestone reached
            if (hasLeveledUp && message.channel.isTextBased()) {
                const levelEmbed = new EmbedBuilder()
                    .setColor(Colors.SUCCESS)
                    .setTitle(`${EMOJIS.BOLT} Level Up Milestone!`)
                    .setDescription(`🎉 Congratulations, <@${userId}>!\n` +
                    `Your community activity has elevated you to **Level ${progress.level}**! 🚀\n\n` +
                    `${levelService.renderProgressBar(progress.progressPercent, 12)}`)
                    .setThumbnail(message.author.displayAvatarURL({ size: 128 }))
                    .setFooter({ text: FOOTER_TEXT })
                    .setTimestamp();
                if (newlyUnlocked.length > 0) {
                    levelEmbed.addFields({
                        name: "🏆 New Achievement Unlocked!",
                        value: newlyUnlocked.map((b) => `${b.emoji} **${b.name}** — *${b.description}*`).join("\n"),
                        inline: false,
                    });
                }
                if ("send" in message.channel && typeof message.channel.send === "function") {
                    await message.channel.send({
                        content: `⚡ Congratulations <@${userId}> on reaching **Level ${progress.level}**!`,
                        embeds: [levelEmbed],
                    });
                }
            }
        }
        catch (error) {
            logger.error({ error, userId, guildId }, "Error processing MessageCreate activity");
        }
    },
};
//# sourceMappingURL=message-create.js.map