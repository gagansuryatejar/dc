/**
 * /streak slash command.
 * View current activity streak status, time remaining, and upcoming reward tiers.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { memberRepository } from "../../../database/index.js";
import { streakService } from "../services/streak.service.js";
import { formatDuration } from "../../../utils/helpers.js";

export const streakCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("streak")
    .setDescription("Inspect your current daily login streak and upcoming milestone rewards"),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const member = await memberRepository.findOrCreate(
      guildId,
      interaction.user.id,
      interaction.user.username,
    );

    const status = streakService.getStatus(member.lastDaily, member.dailyStreak);

    const statusText = status.isClaimable
      ? "🟢 **Ready to claim right now!** Run `/daily` to continue your streak."
      : `⏳ **Next claim available in:** ${formatDuration(status.timeUntilNextMs)}`;

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`🔥 Activity Streak: ${member.dailyStreak} Days`)
      .setDescription(
        `Consistency powers community growth! Maintain your streak by using \`/daily\` once every 24-48 hours.\n\n` +
          `**Current Status:**\n${statusText}`,
      )
      .addFields(
        {
          name: "Milestone Rewards Guide",
          value:
            "• **3 Days:** +160 XP / claim + 🔥 `Consistent Contributor` badge\n" +
            "• **7 Days:** +240 XP / claim + 🏆 `Weekly Champion` badge\n" +
            "• **30 Days:** +700 XP / claim (Max Bonus) + 💎 `Iron Will` badge",
          inline: false,
        },
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
