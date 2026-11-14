/**
 * /poll slash command.
 * Interactive community polls with live button voting and visual tally bars.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { pollRepository } from "../repositories/poll.repository.js";
import { sanitizeString } from "../../../security/validators.js";

const OPTION_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣"];

export const pollCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("poll")
    .setDescription("Create interactive community polls with live voting")
    .addSubcommand((sub) =>
      sub
        .setName("create")
        .setDescription("Launch a new community poll")
        .addStringOption((opt) =>
          opt
            .setName("question")
            .setDescription("The poll question")
            .setMaxLength(250)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("option1")
            .setDescription("First choice")
            .setMaxLength(100)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("option2")
            .setDescription("Second choice")
            .setMaxLength(100)
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt
            .setName("option3")
            .setDescription("Third choice (optional)")
            .setMaxLength(100)
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt
            .setName("option4")
            .setDescription("Fourth choice (optional)")
            .setMaxLength(100)
            .setRequired(false),
        ),
    ),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 5000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const question = sanitizeString(interaction.options.getString("question", true), 250);
    const opt1 = sanitizeString(interaction.options.getString("option1", true), 100);
    const opt2 = sanitizeString(interaction.options.getString("option2", true), 100);
    const opt3 = interaction.options.getString("option3");
    const opt4 = interaction.options.getString("option4");

    const options = [opt1, opt2];
    if (opt3) options.push(sanitizeString(opt3, 100));
    if (opt4) options.push(sanitizeString(opt4, 100));

    const poll = await pollRepository.create({
      guildId,
      creatorId: interaction.user.id,
      channelId: interaction.channelId,
      question,
      options,
    });

    const optionLines = options.map(
      (opt, idx) => `${OPTION_EMOJIS[idx]} **${opt}**\n\`[░░░░░░░░░░]\` **0%** (0 votes)`,
    );

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`📊 Community Poll: ${question}`)
      .setDescription(optionLines.join("\n\n"))
      .addFields({
        name: "Poll Metadata",
        value: `👤 Created by <@${interaction.user.id}> • Total Votes: **0**`,
      })
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    const buttons = options.map((opt, idx) =>
      new ButtonBuilder()
        .setCustomId(`poll_vote:${poll.id}:${idx}`)
        .setEmoji(OPTION_EMOJIS[idx]!)
        .setLabel(opt.slice(0, 20))
        .setStyle(ButtonStyle.Primary),
    );

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(buttons);

    const replyMsg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    await pollRepository.update(poll.id, { messageId: replyMsg.id });
  },
};
