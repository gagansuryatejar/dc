/**
 * NEXUS AI — /poll command
 * Create and manage polls with multiple options.
 */

import {
  SlashCommandBuilder,
  EmbedBuilder,
  ChatInputCommandInteraction,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import * as pollRepo from "../repositories/poll.repository.js";

export const data = new SlashCommandBuilder()
  .setName("poll")
  .setDescription("Create and manage polls")
  .addSubcommand((sub) =>
    sub.setName("create").setDescription("Create a new poll")
      .addStringOption((opt) => opt.setName("question").setDescription("Poll question").setRequired(true).setMaxLength(200))
      .addStringOption((opt) => opt.setName("options").setDescription("Comma-separated options (2-10)").setRequired(true))
      .addBooleanOption((opt) => opt.setName("multiple").setDescription("Allow multiple votes per user").setRequired(false))
      .addIntegerOption((opt) => opt.setName("duration").setDescription("Duration in minutes (default: no expiry)").setMinValue(1).setMaxValue(10080)),
  )
  .addSubcommand((sub) =>
    sub.setName("vote").setDescription("Vote on a poll")
      .addStringOption((opt) => opt.setName("id").setDescription("Poll ID").setRequired(true))
      .addIntegerOption((opt) => opt.setName("option").setDescription("Option index (0-based)").setRequired(true).setMinValue(0)),
  )
  .addSubcommand((sub) =>
    sub.setName("results").setDescription("View poll results")
      .addStringOption((opt) => opt.setName("id").setDescription("Poll ID").setRequired(true)),
  )
  .addSubcommand((sub) =>
    sub.setName("close").setDescription("Close a poll (creator only)")
      .addStringOption((opt) => opt.setName("id").setDescription("Poll ID").setRequired(true)),
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const guildId = interaction.guildId!;
  const userId = interaction.user.id;
  const channelId = interaction.channelId!;
  const subcommand = interaction.options.getSubcommand();

  if (subcommand === "create") {
    const question = interaction.options.getString("question", true);
    const optionsStr = interaction.options.getString("options", true);
    const allowMultiple = interaction.options.getBoolean("multiple") || false;
    const duration = interaction.options.getInteger("duration");

    const options = optionsStr.split(",").map((o) => o.trim()).filter((o) => o.length > 0);

    if (options.length < 2 || options.length > 10) {
      await interaction.reply({ content: "Please provide 2-10 options separated by commas.", flags: 64 });
      return;
    }

    const expiresAt = duration ? new Date(Date.now() + duration * 60000) : undefined;

    const poll = await pollRepo.create({
      guildId,
      creatorId: userId,
      channelId,
      question,
      options,
      allowMultiple,
      expiresAt,
    });

    const embed = buildPollEmbed(poll.question, [], 0, allowMultiple, options);
    const row = buildPollSelectMenu(poll.id, options, allowMultiple);

    const reply = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    await pollRepo.setMessageId(poll.id, reply.id);

    return;
  }

  if (subcommand === "vote") {
    const pollId = interaction.options.getString("id", true);
    const optionIndex = interaction.options.getInteger("option", true);

    try {
      const updatedPoll = await pollRepo.recordVote(pollId, userId, optionIndex);
      const options = typeof updatedPoll.options === "string" ? JSON.parse(updatedPoll.options) : updatedPoll.options;
      const embed = buildPollEmbed(
        updatedPoll.question,
        updatedPoll.tally,
        updatedPoll.totalVotes,
        updatedPoll.allowMultiple,
        options,
      );
      await interaction.reply({ embeds: [embed], flags: 64 });
    } catch (err) {
      await interaction.reply({ content: `Error: ${err instanceof Error ? err.message : "Failed to vote"}`, flags: 64 });
    }
    return;
  }

  if (subcommand === "results") {
    const pollId = interaction.options.getString("id", true);
    const poll = await pollRepo.findById(pollId);

    if (!poll) {
      await interaction.reply({ content: "Poll not found.", flags: 64 });
      return;
    }

    const options = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
    const tally = new Array(options.length).fill(0);
    const embed = buildPollEmbed(poll.question, tally, 0, poll.allowMultiple, options);
    await interaction.reply({ embeds: [embed], flags: 64 });
    return;
  }

  if (subcommand === "close") {
    const pollId = interaction.options.getString("id", true);
    const poll = await pollRepo.findById(pollId);

    if (!poll) {
      await interaction.reply({ content: "Poll not found.", flags: 64 });
      return;
    }

    if (poll.creatorId !== userId) {
      await interaction.reply({ content: "Only the poll creator can close it.", flags: 64 });
      return;
    }

    await pollRepo.closePoll(pollId);
    await interaction.reply({ content: "Poll closed.", flags: 64 });
  }
}

function buildPollEmbed(question: string, tally: number[], totalVotes: number, allowMultiple: boolean, options: string[]): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`📊 ${question}`)
    .setColor(0x5865f2)
    .setFooter({ text: `Poll ID: ${options.length > 0 ? "" : ""}` });

  const optionLines = options.map((opt: string, i: number) => {
    const count = tally[i] || 0;
    const percent = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : "0.0";
    const bar = "█".repeat(Math.round((count / (totalVotes || 1)) * 10));
    return `${i + 1}. ${opt} — ${count} votes (${percent}%) ${bar}`;
  });

  embed.setDescription(optionLines.join("\n"));
  embed.addFields(
    { name: "Total Votes", value: totalVotes.toString(), inline: true },
    { name: "Mode", value: allowMultiple ? "Multiple Choice" : "Single Choice", inline: true },
  );

  return embed;
}

function buildPollSelectMenu(pollId: string, options: string[], allowMultiple: boolean): ActionRowBuilder<StringSelectMenuBuilder> {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`poll_vote_${pollId}`)
    .setPlaceholder("Select an option to vote")
    .setMinValues(1)
    .setMaxValues(allowMultiple ? options.length : 1)
    .addOptions(
      options.map((opt, i) => ({
        label: opt.slice(0, 100),
        value: i.toString(),
        description: `Option ${i + 1}`,
      })),
    );

  return new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
}