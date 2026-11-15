/**
 * NEXUS AI — /leaderboard command
 * Display top members by XP, level, voice time, or reputation.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";

export const data = new SlashCommandBuilder()
  .setName("leaderboard")
  .setDescription("View server leaderboards")
  .addStringOption((option) =>
    option
      .setName("type")
      .setDescription("Leaderboard type")
      .setRequired(true)
      .addChoices(
        { name: "XP / Level", value: "xp" },
        { name: "Voice Time", value: "voice" },
        { name: "Reputation", value: "reputation" },
        { name: "Daily Streak", value: "streak" },
        { name: "Coins", value: "coins" },
      ),
  )
  .addIntegerOption((option) =>
    option.setName("limit").setDescription("Number of entries (default 10, max 25)").setMinValue(1).setMaxValue(25),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const type = interaction.options.getString("type", true);
  const limit = interaction.options.getInteger("limit") || 10;

  let members: any[];
  let title: string;
  let fieldName: string;
  let getValue: (m: any) => number | string;

  switch (type) {
    case "xp":
      members = await memberRepository.findTopByXp(guildId, limit);
      title = "🏆 XP Leaderboard";
      fieldName = "XP";
      getValue = (m) => m.xp.toLocaleString();
      break;
    case "voice":
      members = await memberRepository.findTopByVoiceMinutes(guildId, limit);
      title = "🎤 Voice Time Leaderboard";
      fieldName = "Minutes";
      getValue = (m) => (m.voiceMinutes || 0);
      break;
    case "reputation":
      members = await memberRepository.findTopByReputation(guildId, limit);
      title = "🤝 Reputation Leaderboard";
      fieldName = "Rep";
      getValue = (m) => m.reputation || 0;
      break;
    case "streak":
      members = await memberRepository.findTopByStreak(guildId, limit);
      title = "🔥 Daily Streak Leaderboard";
      fieldName = "Days";
      getValue = (m) => m.dailyStreak || 0;
      break;
    case "coins":
      members = await memberRepository.findTopByCoins(guildId, limit);
      title = "💰 Coins Leaderboard";
      fieldName = "Coins";
      getValue = (m) => (m.coins || 0).toLocaleString();
      break;
    default:
      await interaction.reply({ content: "Invalid leaderboard type.", flags: 64 });
      return;
  }

  if (members.length === 0) {
    await interaction.reply({ content: "No data available for this leaderboard.", flags: 64 });
    return;
  }

  const embed = new EmbedBuilder()
    .setTitle(title)
    .setColor(0x5865f2)
    .setFooter({ text: "NEXUS AI Community" });

  const description = members
    .map((m, i) => {
      const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "`#" + (i + 1) + "`";
      return `${medal} <@${m.userId}> — **${getValue(m)}** ${fieldName}`;
    })
    .join("\n");

  embed.setDescription(description);

  await interaction.reply({ embeds: [embed] });
}