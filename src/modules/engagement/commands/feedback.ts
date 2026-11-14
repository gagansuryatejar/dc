/**
 * /feedback slash command.
 * Enables community members to submit constructive feedback or suggestions directly to server staff.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { ENGAGEMENT } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors, createSuccessEmbed, createErrorEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { guildRepository } from "../../../database/index.js";
import { sanitizeString } from "../../../security/validators.js";
import { auditService, AuditAction } from "../../../security/audit.js";

export const feedbackCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("feedback")
    .setDescription("Send private community feedback directly to the server administration")
    .addStringOption((opt) =>
      opt
        .setName("message")
        .setDescription("Your feedback, thoughts, or suggestions for server improvement")
        .setMaxLength(1000)
        .setRequired(true),
    )
    .addBooleanOption((opt) =>
      opt
        .setName("anonymous")
        .setDescription("Whether to submit feedback anonymously (staff will not see your name)")
        .setRequired(false),
    ),

  module: ENGAGEMENT,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 30_000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const rawMessage = interaction.options.getString("message", true);
    const isAnonymous = interaction.options.getBoolean("anonymous") ?? false;
    const message = sanitizeString(rawMessage, 1000);

    const guildData = await guildRepository.findById(guildId);
    const logChannelId = guildData?.logChannel;

    if (!logChannelId) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            "Feedback Unavailable",
            "This server has not configured an administrative log channel yet. Please ask an administrator to run `/admin log-channel`.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const logChannel = interaction.guild?.channels.cache.get(logChannelId);
    if (!logChannel || !logChannel.isTextBased()) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            "Channel Error",
            "The configured administrative channel is invalid or unreachable. Please notify the moderation team.",
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const senderText = isAnonymous
      ? "🕵️ *Anonymous Community Member*"
      : `<@${interaction.user.id}> (${interaction.user.username})`;

    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle(`${EMOJIS.BOOK} Inbound Community Feedback`)
      .setDescription(`"${message}"`)
      .addFields(
        { name: "Submitted By", value: senderText, inline: true },
        { name: "Channel Context", value: `<#${interaction.channelId}>`, inline: true },
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    await logChannel.send({ embeds: [embed] });

    await auditService.log(guildId, AuditAction.SECURITY_VIOLATION, {
      userId: isAnonymous ? undefined : interaction.user.id,
      details: { feedbackReceived: true, anonymous: isAnonymous },
      severity: "info",
    });

    await interaction.reply({
      embeds: [
        createSuccessEmbed(
          "Feedback Submitted",
          "Thank you! Your feedback has been forwarded directly to the server administrators.",
        ),
      ],
      ephemeral: true,
    });
  },
};
