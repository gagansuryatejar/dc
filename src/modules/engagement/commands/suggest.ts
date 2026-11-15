/**
 * NEXUS AI — /suggest command
 * Submit and manage community suggestions with voting.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import * as suggestionRepo from "../repositories/suggestion.repository.js";

export const data = new SlashCommandBuilder()
  .setName("suggest")
  .setDescription("Submit a community suggestion")
  .addSubcommand((sub) =>
    sub.setName("create").setDescription("Create a new suggestion")
      .addStringOption((opt) => opt.setName("content").setDescription("Your suggestion (max 1000 chars)").setRequired(true).setMaxLength(1000)),
  )
  .addSubcommand((sub) =>
    sub.setName("list").setDescription("List recent suggestions")
      .addIntegerOption((opt) => opt.setName("limit").setDescription("Number to show (default 10, max 25)").setMinValue(1).setMaxValue(25)),
  )
  .addSubcommand((sub) =>
    sub.setName("vote").setDescription("Vote on a suggestion")
      .addStringOption((opt) => opt.setName("id").setDescription("Suggestion ID").setRequired(true))
      .addStringOption((opt) => opt.setName("vote").setDescription("Vote type").setRequired(true).addChoices({ name: "Upvote", value: "upvote" }, { name: "Downvote", value: "downvote" })),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "create") {
    const content = interaction.options.getString("content", true);

    const suggestion = await suggestionRepo.create({
      guildId,
      userId,
      username: interaction.user.username,
      content,
    });

    const embed = new EmbedBuilder()
      .setTitle("💡 New Suggestion Submitted")
      .setDescription(content)
      .setColor(0x5865f2)
      .addFields(
        { name: "Author", value: interaction.user.toString(), inline: true },
        { name: "Status", value: "🟢 Open", inline: true },
        { name: "Votes", value: "👍 0 | 👎 0", inline: true },
      )
      .setFooter({ text: `Suggestion ID: ${suggestion.id.slice(0, 8)}` });

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setCustomId(`suggest_up_${suggestion.id}`).setLabel("👍 Upvote").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`suggest_down_${suggestion.id}`).setLabel("👎 Downvote").setStyle(ButtonStyle.Danger),
    );

    await interaction.reply({ embeds: [embed], components: [row] });
    return;
  }

  if (subcommand === "list") {
    const limit = interaction.options.getInteger("limit") || 10;
    const suggestions = await suggestionRepo.findByGuild(guildId, { limit });

    if (suggestions.length === 0) {
      await interaction.reply({ content: "No suggestions found.", flags: 64 });
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle("💡 Community Suggestions")
      .setColor(0x5865f2)
      .setFooter({ text: "NEXUS AI Community" });

    const description = suggestions
      .map((s, i) => {
        const statusEmoji = s.status === "open" ? "🟢" : s.status === "accepted" ? "✅" : s.status === "rejected" ? "❌" : "🚀";
        return `${i + 1}. ${statusEmoji} **${s.content}** — by <@${s.userId}> (👍 ${s.upvoteCount} | 👎 ${s.downvoteCount}) [ID: ${s.id.slice(0, 8)}]`;
      })
      .join("\n");

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (subcommand === "vote") {
    const suggestionId = interaction.options.getString("id", true);
    const voteType = interaction.options.getString("vote", true) as "upvote" | "downvote";

    try {
      const result = await suggestionRepo.toggleVote(suggestionId, userId, voteType);
      const suggestion = await suggestionRepo.findById(suggestionId);

      const embed = new EmbedBuilder()
        .setTitle("🗳️ Vote Recorded")
        .setDescription(`Your ${voteType} has been recorded.`)
        .setColor(voteType === "upvote" ? 0x00ff00 : 0xff0000)
        .addFields(
          { name: "Suggestion", value: suggestion?.content || "Unknown", inline: false },
          { name: "Votes", value: `👍 ${result.upvoteCount} | 👎 ${result.downvoteCount}`, inline: true },
        )
        .setFooter({ text: "NEXUS AI Community" });

      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch {
      await interaction.reply({ content: "Suggestion not found or invalid ID.", flags: 64 });
    }
  }
}