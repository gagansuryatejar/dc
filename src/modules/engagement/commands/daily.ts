/**
 * NEXUS AI — /daily command
 * Claim daily rewards with streak tracking.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { calculateClaim, formatCooldown } from "../services/streak.service.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

export const data = new SlashCommandBuilder()
  .setName("daily")
  .setDescription("Claim your daily reward and maintain your streak");

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;

  const member = await memberRepository.findOrCreate({ guildId, userId, username: interaction.user.username });

  const lastDailyAt = member.lastDaily ?? null;
  const result = calculateClaim(lastDailyAt, member.dailyStreak);

  if (!result.success) {
    const embed = new EmbedBuilder()
      .setTitle("⏳ Daily Reward on Cooldown")
      .setDescription(result.message)
      .setColor(0xffa500)
      .addFields({ name: "Time Remaining", value: formatCooldown(result.cooldownRemainingMs || 0), inline: true })
      .setFooter({ text: FOOTER_TEXT });
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  // Award rewards
  const newXp = member.xp + result.xpEarned;
  const newCoins = member.coins + result.coinsEarned;

  await memberRepository.update(guildId, userId, {
    xp: newXp,
    coins: newCoins,
    dailyStreak: result.newStreak,
    lastDaily: new Date(),
  });

  const embed = new EmbedBuilder()
    .setTitle("✅ Daily Reward Claimed!")
    .setDescription(result.message)
    .setColor(0x00ff00)
    .addFields(
      { name: "📊 Streak", value: `${result.newStreak} day${result.newStreak !== 1 ? "s" : ""}`, inline: true },
      { name: "✨ XP Earned", value: `+${result.xpEarned}`, inline: true },
      { name: "💰 Coins Earned", value: `+${result.coinsEarned}`, inline: true },
      { name: "📈 Total XP", value: newXp.toLocaleString(), inline: true },
      { name: "💰 Total Coins", value: newCoins.toLocaleString(), inline: true },
    )
    .setFooter({ text: FOOTER_TEXT });

  await interaction.reply({ embeds: [embed] });
}