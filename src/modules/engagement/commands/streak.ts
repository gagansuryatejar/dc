/**
 * View current daily streak and streak rewards.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { calculateClaim } from "../services/streak.service.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("streak")
  .setDescription("View your daily streak status and rewards")
  .addUserOption((option) =>
    option.setName("user").setDescription("Member to view (defaults to you)"),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const targetUser = interaction.options.getUser("user") || interaction.user;

  const member = await memberRepository.findOrCreate({ guildId, userId: targetUser.id, username: targetUser.username });

  const lastDailyAt = member.lastDaily ?? null;
  const result = calculateClaim(lastDailyAt, member.dailyStreak);

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Daily Streak`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .setColor(result.success ? 0x00ff00 : 0xffa500)
    .addFields(
      { name: "🔥 Current Streak", value: `${member.dailyStreak} day${member.dailyStreak !== 1 ? "s" : ""}`, inline: true },
      { name: "📅 Last Claim", value: member.lastDaily ? `<t:${Math.floor(new Date(member.lastDaily).getTime() / 1000)}:R>` : "Never", inline: true },
      { name: "⏳ Status", value: result.success ? "✅ Ready to claim!" : "⏳ On cooldown", inline: true },
    );

  if (!result.success) {
    embed.addFields({ name: "Time Remaining", value: result.message, inline: false });
  } else {
    const nextRewardXp = 120 + Math.min((member.dailyStreak + 1) * 10, 500);
    const nextRewardCoins = 50 + Math.min((member.dailyStreak + 1) * 5, 250);
    embed.addFields({
      name: "Next Reward",
      value: `+${nextRewardXp} XP, +${nextRewardCoins} Coins (Streak ${member.dailyStreak + 1})`,
      inline: false,
    });
  }

  // Streak milestones
  const milestones = [3, 7, 14, 30, 60, 100];
  const nextMilestone = milestones.find((m) => m > member.dailyStreak);
  if (nextMilestone) {
    embed.addFields({
      name: "🎯 Next Milestone",
      value: `${nextMilestone} days for a special badge!`,
      inline: false,
    });
  }

  embed.setFooter({ text: FOOTER_TEXT });

  await interaction.reply({ embeds: [embed] });
}