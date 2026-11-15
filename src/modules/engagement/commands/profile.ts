/**
 * NEXUS AI — /profile command
 * Display member profile with level, XP, badges, streak, reputation, bio.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  User,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { calculateProgress } from "../services/level.service.js";
import { getBadgeById } from "../services/achievement.service.js";
import { formatDuration } from "../../../utils/helpers.js";

export const data = new SlashCommandBuilder()
  .setName("profile")
  .setDescription("View your or another member's profile")
  .addUserOption((option) =>
    option.setName("user").setDescription("Member to view (defaults to you)"),
  );

function formatBadges(badgeIds: string[]): string {
  if (badgeIds.length === 0) return "No badges yet";
  const badgeList = badgeIds.map((id) => {
    const badge = getBadgeById(id);
    return badge ? `${badge.emoji} ${badge.name}` : id;
  });
  return badgeList.join(", ");
}

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const targetUser: User = interaction.options.getUser("user") || interaction.user;
  const guildId = interaction.guildId!;

  // Ensure member record exists
  await memberRepository.findOrCreate({ guildId, userId: targetUser.id, username: targetUser.username });

  const member = await memberRepository.findByGuildAndUser(guildId, targetUser.id);
  if (!member) {
    await interaction.reply({ content: "Could not load profile.", flags: 64 });
    return;
  }

  const progress = calculateProgress(member.xp);
  const badgesList = formatBadges(JSON.parse(member.badges || "[]"));

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Profile`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 256 }))
    .setColor(0x5865f2)
    .addFields(
      { name: "📊 Level", value: `**Level ${progress.level}** (${progress.progressPercent}%)`, inline: true },
      { name: "✨ XP", value: `${member.xp.toLocaleString()} / ${progress.nextLevelXp.toLocaleString()}`, inline: true },
      { name: "🔥 Daily Streak", value: `${member.dailyStreak} day${member.dailyStreak !== 1 ? "s" : ""}`, inline: true },
      { name: "🤝 Reputation", value: member.reputation.toString(), inline: true },
      { name: "🎤 Voice Time", value: formatDuration(member.voiceMinutes * 60000), inline: true },
      { name: "💰 Coins", value: member.coins.toLocaleString(), inline: true },
    )
    .setFooter({ text: "NEXUS AI Community" });

  if (member.birthday) {
    embed.addFields({ name: "🎂 Birthday", value: member.birthday, inline: true });
  }

  if (member.bio) {
    embed.addFields({ name: "📝 Bio", value: member.bio, inline: false });
  }

  if (badgesList !== "No badges yet") {
    embed.addFields({ name: "🏅 Badges", value: badgesList, inline: false });
  }

  embed.addFields({ name: "🆔 User ID", value: targetUser.id, inline: true });
  embed.addFields({ name: "📅 Joined Discord", value: `<t:${Math.floor(targetUser.createdTimestamp / 1000)}:R>`, inline: true });

  await interaction.reply({ embeds: [embed] });
}