/**
 * Interactive Button Handler for Support Tickets in NEXUS AI.
 * Handles ticket creation, close, and transcript export buttons.
 */

import { Interaction, ButtonInteraction, TextChannel, EmbedBuilder } from "discord.js";
import { ticketService } from "../services/ticket.service.js";
import { Colors } from "../../../utils/embeds.js";
import { type NexusEvent } from "../../../types/index.js";
import { MODERATION } from "../../../config/features.js";

export const ticketButtonsEvent: NexusEvent<"interactionCreate"> = {
  name: "interactionCreate",
  once: false,
  module: MODERATION,
  async execute(interaction: Interaction): Promise<void> {
    if (!interaction.isButton()) return;
    const button = interaction as ButtonInteraction;
    const { customId, guild, user } = button;

    if (!guild) return;

    // ── Ticket Creation Buttons ────────────────────────────────
    if (customId.startsWith("ticket_create_")) {
      const category = customId.replace("ticket_create_", "");
      await button.deferReply({ ephemeral: true });

      try {
        const { ticket, channel } = await ticketService.createTicket(
          guild,
          user,
          category,
          `${category.toUpperCase()} Support Inquiry`,
        );

        if (channel) {
          await button.editReply({
            content: `✅ Your support ticket has been created: <#${channel.id}>`,
          });
        } else {
          await button.editReply({
            content: `✅ Support ticket #${ticket.ticketNumber} registered in the system.`,
          });
        }
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to create support ticket";
        await button.editReply({ content: `❌ ${errorMsg}` });
      }
      return;
    }

    // ── In-Ticket Close Button ─────────────────────────────────
    if (customId.startsWith("ticket_close_")) {
      const ticketId = customId.replace("ticket_close_", "");
      await button.deferReply();

      try {
        await ticketService.closeTicket(
          guild.id,
          ticketId,
          user.id,
          "Closed via ticket action button",
          button.channel as TextChannel,
        );
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : "Failed to close ticket";
        await button.editReply({ content: `❌ ${errorMsg}` });
      }
      return;
    }

    // ── In-Ticket Transcript Button ────────────────────────────
    if (customId.startsWith("ticket_transcript_")) {
      const ticketId = customId.replace("ticket_transcript_", "");
      const ticket = await ticketService.getTicket(ticketId);

      if (!ticket) {
        await button.reply({ content: "❌ Ticket record not found.", ephemeral: true });
        return;
      }

      const channel = button.channel as TextChannel;
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
        );

      await button.reply({ embeds: [embed], ephemeral: true });
      return;
    }
  },
};
