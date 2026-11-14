/**
 * Community Pulse Slash Command for NEXUS AI.
 * Performs AI-powered sentiment, mood, and discussion analysis.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  TextChannel,
  ChannelType,
} from "discord.js";
import { type NexusCommand, PermissionLevel } from "../../../types/index.js";
import { AI } from "../../../config/features.js";
import { communityPulseService } from "../services/community-pulse.service.js";
import { createBaseEmbed, createErrorEmbed, Colors } from "../../../utils/embeds.js";

export const pulseCommand: NexusCommand = {
  module: AI,
  permissions: PermissionLevel.MEMBER,
  data: new SlashCommandBuilder()
    .setName("pulse")
    .setDescription("AI-powered community mood, sentiment, and discussion pulse analysis")
    .addChannelOption((opt) =>
      opt
        .setName("channel")
        .setDescription("Channel to analyze (defaults to current)")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false),
    )
    .addIntegerOption((opt) =>
      opt
        .setName("sample")
        .setDescription("Number of recent messages to analyze (default: 30, max: 50)")
        .setMinValue(10)
        .setMaxValue(50)
        .setRequired(false),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        embeds: [createErrorEmbed("Guild Only", "This command can only be used in a Discord server.")],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const targetChannel =
      (interaction.options.getChannel("channel") as TextChannel) ||
      (interaction.channel as TextChannel);

    const sampleLimit = interaction.options.getInteger("sample") || 30;

    let sampleTexts: string[] = [];

    try {
      if (targetChannel && targetChannel.messages) {
        const fetched = await targetChannel.messages.fetch({ limit: sampleLimit });
        sampleTexts = fetched
          .filter((m) => !m.author.bot && m.content.trim().length > 0)
          .map((m) => m.content);
      }
    } catch {
      // If fetching fails due to permissions, fallback to general sample
      sampleTexts = [];
    }

    try {
      const pulse = await communityPulseService.analyzePulse(guildId, sampleTexts, true);

      const moodEmoji =
        pulse.sentimentLabel === "Enthusiastic"
          ? "🔥"
          : pulse.sentimentLabel === "Positive"
          ? "✨"
          : pulse.sentimentLabel === "Constructive"
          ? "💡"
          : pulse.sentimentLabel === "Negative"
          ? "⚠️"
          : "💬";

      const embed = createBaseEmbed()
        .setColor(
          pulse.sentimentLabel === "Negative"
            ? Colors.WARNING
            : pulse.sentimentLabel === "Enthusiastic"
            ? Colors.ACCENT
            : Colors.PRIMARY,
        )
        .setTitle(`${moodEmoji} Community Discussion Pulse: ${targetChannel?.name || "Server"}`)
        .setDescription(
          `Analyzed **${pulse.sampleSize}** recent messages using the NEXUS AI Sentiment Engine.`,
        )
        .addFields(
          {
            name: "🎭 Prevailing Community Mood",
            value: `• **Mood:** ${pulse.prevailingMood}\n• **Sentiment:** ${pulse.sentimentLabel} (${pulse.sentimentScore >= 0 ? `+${pulse.sentimentScore}` : pulse.sentimentScore})`,
            inline: true,
          },
          {
            name: "📈 Engagement Health",
            value: `• **Status:** \`${pulse.engagementHealth.toUpperCase()}\`\n• **Active Topics:** ${pulse.trendingTopics.length}`,
            inline: true,
          },
          {
            name: "🔥 Trending Keywords & Topics",
            value: pulse.trendingTopics.map((t) => `\`#${t}\``).join("  "),
            inline: false,
          },
          {
            name: "💬 Discussion Highlights",
            value: pulse.keyHighlights.map((h) => `• "${h}"`).join("\n"),
            inline: false,
          },
          {
            name: "💡 Recommended Moderator Action",
            value: `_${pulse.actionableAdvice}_`,
            inline: false,
          },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [createErrorEmbed("Analysis Failed", "Could not complete the community pulse check.")],
      });
    }
  },
};
