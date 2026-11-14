/**
 * /leaderboard slash command.
 * Displays community rankings across XP/levels, voice activity, reputation, and streaks.
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
import { prisma } from "../../../database/index.js";
import { formatNumber } from "../../../utils/helpers.js";

const MEDALS = ["🥇", "🥈", "🥉", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];

export const leaderboardCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("leaderboard")
    .setDescription("View top community members across various activities")
    .addStringOption((opt) =>
      opt
        .setName("category")
        .setDescription("Ranking category")
        .setRequired(false)
        .addChoices(
          { name: "Experience & Levels (XP)", value: "xp" },
          { name: "Voice Activity", value: "voice" },
          { name: "Reputation (Most Helpful)", value: "reputation" },
          { name: "Daily Streaks", value: "streak" },
        ),
    ),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const category = interaction.options.getString("category") || "xp";

    let orderBy: Record<string, "desc"> = { xp: "desc" };
    let title = "🏆 Experience & Level Leaderboard";
    let formatter = (m: any) => `Level **${m.level}** — \`${formatNumber(m.xp)} XP\``;

    if (category === "voice") {
      orderBy = { voiceMinutes: "desc" };
      title = "🎙️ Voice Activity Leaderboard";
      formatter = (m: any) => `**${(m.voiceMinutes / 60).toFixed(1)}h** (\`${formatNumber(m.voiceMinutes)} mins\`)`;
    } else if (category === "reputation") {
      orderBy = { reputation: "desc" };
      title = "🤝 Most Helpful Members (Reputation)";
      formatter = (m: any) => `**+${formatNumber(m.reputation)}** endorsements`;
    } else if (category === "streak") {
      orderBy = { dailyStreak: "desc" };
      title = "🔥 Daily Activity Streaks";
      formatter = (m: any) => `**${formatNumber(m.dailyStreak)} days** streak`;
    }

    const topMembers = await prisma.guildMember.findMany({
      where: { guildId },
      orderBy,
      take: 10,
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(title)
      .setDescription(`Top community contributors in **${interaction.guild?.name}**:`)
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    if (topMembers.length === 0) {
      embed.setDescription("No activity data recorded yet for this community.");
    } else {
      const lines = topMembers.map((m, idx) => {
        const medal = MEDALS[idx] || `\`#${idx + 1}\``;
        return `${medal} <@${m.userId}> — ${formatter(m)}`;
      });

      embed.addFields({
        name: "Standings",
        value: lines.join("\n"),
        inline: false,
      });
    }

    await interaction.reply({ embeds: [embed] });
  },
};
