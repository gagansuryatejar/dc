/**
 * Ticket Commands for NEXUS AI.
 * Handles /ticket panel, /ticket close, and /ticket transcript.
 */

import {
  SlashCommandBuilder,
  SlashCommandChannelOption,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  ChannelType,
  TextChannel,
  EmbedBuilder,
} from "discord.js";
import { ticketService } from "../services/ticket.service.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { Colors } from "../../../utils/embeds.js";
import { sanitizeString } from "../../../security/validators.js";
import { type NexusCommand, PermissionLevel } from "../../../types/index.js";
import { MODERATION } from "../../../config/features.js";

export const ticketCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Community support ticket management")
    .addSubcommand((sub) =>
      sub
        .setName("panel")
        .setDescription("Post an interactive support ticket panel in a channel")
        .addChannelOption((opt: SlashCommandChannelOption) =>
          opt
            .setName("channel")
            .setDescription("The channel to send the panel to (defaults to current)")
            .addChannelTypes(ChannelType.GuildText)
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("close")
        .setDescription("Close the current support ticket")
        .addStringOption((opt) =>
          opt.setName("reason").setDescription("Reason for closing the ticket").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("transcript")
        .setDescription("Export a message transcript of the current ticket"),
    ),
  module: MODERATION,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // ── /ticket panel ─────────────────────────────────────────
    if (sub === "panel") {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
        await interaction.reply({
          content: "❌ You need Manage Channels permission to deploy the support ticket panel.",
          ephemeral: true,
        });
        return;
      }
      const targetChannel =
        (interaction.options.getChannel("channel") as TextChannel) ||
        (interaction.channel as TextChannel);

      if (!targetChannel) {
        await interaction.reply({ content: "❌ Target channel not found.", ephemeral: true });
        return;
      }

      const { embeds, components } = ticketService.renderPanel();
      await targetChannel.send({ embeds, components });

      await interaction.reply({
        content: `✅ Support panel successfully posted in <#${targetChannel.id}>.`,
        ephemeral: true,
      });
      return;
    }

    // ── /ticket close ─────────────────────────────────────────
    if (sub === "close") {
      const ticket = await ticketService.getTicketByChannel(interaction.channelId);

      if (!ticket) {
        await interaction.reply({
          content: "❌ This command can only be used inside an active ticket channel.",
          ephemeral: true,
        });
        return;
      }

      if (ticket.status === "closed") {
        await interaction.reply({ content: "ℹ️ This ticket is already closed.", ephemeral: true });
        return;
      }

      const reason = sanitizeString(
        interaction.options.getString("reason") || "Closed via /ticket close",
        300,
      );

      await interaction.reply({ content: "🔒 Closing ticket and archiving messages..." });

      await ticketService.closeTicket(
        guildId,
        ticket.id,
        interaction.user.id,
        reason,
        interaction.channel as TextChannel,
      );
      return;
    }

    // ── /ticket transcript ────────────────────────────────────
    if (sub === "transcript") {
      const ticket = await ticketService.getTicketByChannel(interaction.channelId);

      if (!ticket) {
        await interaction.reply({
          content: "❌ This command can only be used inside a ticket channel.",
          ephemeral: true,
        });
        return;
      }

      const channel = interaction.channel as TextChannel;
      const messages = await channel.messages.fetch({ limit: 50 });
      const sorted = Array.from(messages.values()).reverse();

      const transcriptContent = sorted
        .map((m) => `[${m.createdAt.toLocaleTimeString()}] ${m.author.tag}: ${m.cleanContent}`)
        .join("\n");

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`📋 Ticket #${ticket.ticketNumber} Transcript`)
        .setDescription(
          `**Creator:** <@${ticket.creatorId}>\n` +
            `**Category:** ${ticket.category}\n\n` +
            "```text\n" +
            (transcriptContent.slice(0, 3900) || "No messages recorded.") +
            "\n```",
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};
