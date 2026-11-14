/**
 * /suggest slash command.
 * Community suggestion system with interactive voting buttons and persistence.
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
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { suggestionRepository } from "../repositories/suggestion.repository.js";
import { sanitizeString } from "../../../security/validators.js";

export const suggestCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("suggest")
    .setDescription("Submit an idea or suggestion for community improvement")
    .addStringOption((opt) =>
      opt
        .setName("idea")
        .setDescription("Your suggestion for the community")
        .setMaxLength(1000)
        .setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("anonymous")
        .setDescription("Whether to hide your name on the suggestion card")
        .setRequired(false),
    ),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 10_000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const rawIdea = interaction.options.getString("idea", true);
    const isAnonymous = interaction.options.getBoolean("anonymous") ?? false;
    const idea = sanitizeString(rawIdea, 1000);

    // Initial database record
    const record = await suggestionRepository.create({
      guildId,
      userId: interaction.user.id,
      username: isAnonymous ? "Anonymous Member" : interaction.user.username,
      content: idea,
      channelId: interaction.channelId,
    });

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`${EMOJIS.SPARKLE} Community Suggestion #${record.id.slice(-4).toUpperCase()}`)
      .setDescription(`"${idea}"`)
      .addFields(
        {
          name: "Submitted By",
          value: isAnonymous ? "🕵️ *Anonymous Member*" : `<@${interaction.user.id}> (${interaction.user.username})`,
          inline: true,
        },
        { name: "Status", value: "🟡 `Pending Community Feedback`", inline: true },
        { name: "Votes", value: "👍 **0** | 👎 **0**", inline: true },
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`suggest_upvote:${record.id}`)
        .setLabel("Upvote (0)")
        .setEmoji("👍")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`suggest_downvote:${record.id}`)
        .setLabel("Downvote (0)")
        .setEmoji("👎")
        .setStyle(ButtonStyle.Secondary),
    );

    const replyMsg = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    // Save message ID to suggestion record
    await suggestionRepository.update(record.id, { messageId: replyMsg.id });
  },
};
