/**
 * /daily slash command.
 * Claim daily XP and coin rewards with progressive streak multipliers.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors, createErrorEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { memberRepository } from "../../../database/index.js";
import { streakService } from "../services/streak.service.js";
import { achievementService } from "../services/achievement.service.js";
import { formatDuration } from "../../../utils/helpers.js";

export const dailyCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("daily")
    .setDescription("Claim your daily community reward and build your activity streak"),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 5000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const member = await memberRepository.findOrCreate(
      guildId,
      interaction.user.id,
      interaction.user.username,
    );

    const result = streakService.calculateClaim(member.lastDaily, member.dailyStreak);

    if (!result.success) {
      const waitTime = formatDuration(result.cooldownRemainingMs || 0);
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            "Daily Already Claimed",
            `You have already claimed your daily reward! Please return in **${waitTime}**.\nCurrent streak: **${member.dailyStreak} days** 🔥`,
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // Update database
    const newXp = member.xp + result.xpEarned;
    const newCoins = member.coins + result.coinsEarned;

    // Check newly unlocked badges
    const { newlyUnlocked, updatedBadges } = achievementService.evaluateBadges(member.badges, {
      messageCount: member.messageCount,
      level: member.level,
      dailyStreak: result.newStreak,
      reputation: member.reputation,
      voiceMinutes: member.voiceMinutes,
      hasBirthday: Boolean(member.birthday),
      hasBio: Boolean(member.bio),
    });

    await memberRepository.update(guildId, interaction.user.id, {
      xp: newXp,
      coins: newCoins,
      dailyStreak: result.newStreak,
      lastDaily: new Date(),
      badges: JSON.stringify(updatedBadges),
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.SUCCESS)
      .setTitle(`${EMOJIS.SPARKLE} Daily Rewards Claimed!`)
      .setDescription(
        `Great to see you today, <@${interaction.user.id}>!\n\n` +
          `🔥 **Activity Streak:** **${result.newStreak} Day${result.newStreak === 1 ? "" : "s"}**\n` +
          `✨ **Experience:** **+${result.xpEarned} XP**\n` +
          `🪙 **Virtual Coins:** **+${result.coinsEarned} Coins**\n\n` +
          `*Come back tomorrow to keep your streak alive and maximize rewards!*`,
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    if (newlyUnlocked.length > 0) {
      embed.addFields({
        name: "🏆 New Achievement Unlocked!",
        value: newlyUnlocked.map((b) => `${b.emoji} **${b.name}** — *${b.description}*`).join("\n"),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
