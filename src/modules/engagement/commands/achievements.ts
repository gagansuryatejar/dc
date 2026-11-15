/**
 * NEXUS AI — /achievements command
 * View earned badges and available achievements.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
} from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { BADGE_REGISTRY } from "../services/achievement.service.js";

export const data = new SlashCommandBuilder()
  .setName("achievements")
  .setDescription("View your badges and available achievements")
  .addUserOption((option) =>
    option.setName("user").setDescription("Member to view (defaults to you)"),
  )
  .addStringOption((option) =>
    option.setName("category").setDescription("Filter by category")
      .addChoices(
        { name: "All", value: "all" },
        { name: "General", value: "general" },
        { name: "Level", value: "level" },
        { name: "Streak", value: "streak" },
        { name: "Social", value: "social" },
        { name: "Voice", value: "voice" },
      ),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const targetUser = interaction.options.getUser("user") || interaction.user;
  const category = interaction.options.getString("category") || "all";

  const member = await memberRepository.findOrCreate({ guildId, userId: targetUser.id, username: targetUser.username });
  const earnedBadges: string[] = JSON.parse(member.badges || "[]");

  // Filter badges by category
  let badgesToShow = Object.values(BADGE_REGISTRY);
  if (category !== "all") {
    badgesToShow = badgesToShow.filter((b) => b.category === category);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${targetUser.username}'s Achievements`)
    .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
    .setColor(0x5865f2)
    .setFooter({ text: "NEXUS AI Community" });

  // Earned badges
  const earnedInCategory = badgesToShow.filter((b) => earnedBadges.includes(b.id));
  if (earnedInCategory.length > 0) {
    embed.addFields({
      name: `✅ Earned (${earnedInCategory.length}/${badgesToShow.length})`,
      value: earnedInCategory.map((b) => `${b.emoji} **${b.name}** — ${b.description}`).join("\n"),
      inline: false,
    });
  }

  // Locked badges
  const unearnedInCategory = badgesToShow.filter((b) => !earnedBadges.includes(b.id));
  if (unearnedInCategory.length > 0) {
    embed.addFields({
      name: `🔒 Locked (${unearnedInCategory.length})`,
      value: unearnedInCategory.slice(0, 10).map((b) => `${b.emoji} **${b.name}** — ${b.description}`).join("\n") +
        (unearnedInCategory.length > 10 ? "\n... and more" : ""),
      inline: false,
    });
  }

  if (earnedBadges.length === 0 && category === "all") {
    embed.setDescription("No badges earned yet. Start chatting, claiming dailies, and joining voice to unlock achievements!");
  }

  await interaction.reply({ embeds: [embed] });
}