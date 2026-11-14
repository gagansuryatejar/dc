/**
 * Interactive Support Ticket Engine for NEXUS AI.
 * Manages dynamic private support channels, categorized ticket routing,
 * transcript generation, and ticket resolution workflows.
 */

import {
  Guild,
  User,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  TextChannel,
} from "discord.js";
import { prisma, auditRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";

const logger = createModuleLogger("moderation:tickets");

export interface TicketSummary {
  id: string;
  ticketNumber: number;
  guildId: string;
  channelId: string | null;
  creatorId: string;
  creatorUsername: string;
  subject: string;
  category: string;
  status: string;
  closedBy: string | null;
  closedAt: Date | null;
  closeReason: string | null;
  createdAt: Date;
}

export class TicketService {
  /**
   * Generates the public Support Panel embed and category buttons for a server channel.
   */
  renderPanel(): { embeds: EmbedBuilder[]; components: ActionRowBuilder<ButtonBuilder>[] } {
    const embed = new EmbedBuilder()
      .setColor(Colors.PRIMARY)
      .setTitle("🎫 NEXUS AI — Community Support & Helpdesk")
      .setDescription(
        "Need assistance from server staff, want to report an issue, or submit a moderation appeal?\n\n" +
          "Click one of the buttons below to open a private ticket with our moderation team:\n\n" +
          "• 📩 **General Support**: Inquiries, server help, role assistance\n" +
          "• 🚨 **Report Member**: Rule violations, harassment, scam reports\n" +
          "• ⚖️ **Appeal Infraction**: Warning, timeout, or moderation dispute\n" +
          "• 💼 **Billing / VIP**: Store, subscription, or perk inquiries",
      )
      .setFooter({ text: "NEXUS AI Support Subsystem • One active ticket per category per user" })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_create_general")
        .setLabel("General Support")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📩"),
      new ButtonBuilder()
        .setCustomId("ticket_create_report")
        .setLabel("Report Member")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🚨"),
      new ButtonBuilder()
        .setCustomId("ticket_create_appeal")
        .setLabel("Appeal Penalty")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("⚖️"),
      new ButtonBuilder()
        .setCustomId("ticket_create_billing")
        .setLabel("VIP & Perks")
        .setStyle(ButtonStyle.Success)
        .setEmoji("💼"),
    );

    return { embeds: [embed], components: [row] };
  }

  /**
   * Creates a private support ticket and associated Discord text channel.
   */
  async createTicket(
    guild: Guild,
    user: User,
    category = "general",
    subject = "Support Request",
  ): Promise<{ ticket: TicketSummary; channel: TextChannel | null }> {
    // Check if user already has an open ticket in this category
    const existing = await prisma.supportTicket.findFirst({
      where: {
        guildId: guild.id,
        creatorId: user.id,
        category,
        status: "open",
      },
    });

    if (existing) {
      throw new Error(`You already have an open ticket in this category (<#${existing.channelId}>).`);
    }

    // Determine sequential ticket number
    const count = await prisma.supportTicket.count({
      where: { guildId: guild.id },
    });
    const ticketNumber = count + 1;
    const channelName = `ticket-${String(ticketNumber).padStart(4, "0")}`;

    let channel: TextChannel | null = null;

    try {
      // Create isolated private channel
      channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            deny: [PermissionFlagsBits.ViewChannel],
          },
          {
            id: user.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ReadMessageHistory,
            ],
          },
          {
            id: guild.members.me?.id ?? "",
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ManageChannels,
              PermissionFlagsBits.EmbedLinks,
            ],
          },
        ],
        reason: `NEXUS Support Ticket #${ticketNumber} created for ${user.username}`,
      });
    } catch (err) {
      logger.warn({ err, guildId: guild.id }, "Unable to create Discord channel for ticket");
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        guildId: guild.id,
        channelId: channel?.id ?? null,
        creatorId: user.id,
        creatorUsername: user.username,
        subject,
        category,
        status: "open",
      },
    });

    // If channel was created, send initial greeting embed with close button
    if (channel) {
      const ticketEmbed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`🎫 Ticket #${ticketNumber} — ${category.toUpperCase()}`)
        .setDescription(
          `Welcome <@${user.id}>! A member of the support team will be with you shortly.\n\n` +
            `**Subject:** ${subject}\n` +
            `**Category:** ${category}\n` +
            `**Created:** <t:${Math.floor(Date.now() / 1000)}:R>\n\n` +
            `*Please describe your issue in detail. You can upload screenshots or paste relevant message links.*`,
        )
        .setFooter({ text: "NEXUS AI Support Subsystem" })
        .setTimestamp();

      const actionRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticket.id}`)
          .setLabel("Close Ticket")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
        new ButtonBuilder()
          .setCustomId(`ticket_transcript_${ticket.id}`)
          .setLabel("Save Transcript")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("📋"),
      );

      await channel.send({ content: `<@${user.id}>`, embeds: [ticketEmbed], components: [actionRow] });
    }

    await auditRepository.create(guild.id, "TICKET_CREATE", {
      userId: user.id,
      target: user.id,
      details: `Opened Ticket #${ticketNumber} (${category})`,
      module: "moderation",
      severity: "info",
    });

    return { ticket, channel };
  }

  /**
   * Closes and archives a support ticket.
   */
  async closeTicket(
    guildId: string,
    ticketId: string,
    closedByUserId: string,
    reason = "Resolved by staff",
    channelToClose?: TextChannel,
  ): Promise<TicketSummary> {
    let transcriptText = "";

    if (channelToClose) {
      try {
        const messages = await channelToClose.messages.fetch({ limit: 100 });
        const sorted = Array.from(messages.values()).reverse();
        transcriptText = sorted
          .map((m) => `[${m.createdAt.toISOString()}] ${m.author.tag}: ${m.cleanContent}`)
          .join("\n");
      } catch {}
    }

    const updated = await prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: "closed",
        closedBy: closedByUserId,
        closedAt: new Date(),
        closeReason: reason,
        transcript: transcriptText || undefined,
      },
    });

    await auditRepository.create(guildId, "TICKET_CLOSE", {
      userId: updated.creatorId,
      target: updated.creatorId,
      details: `Closed Ticket #${updated.ticketNumber}. Reason: ${reason} (by ${closedByUserId})`,
      module: "moderation",
      severity: "info",
    });

    // If channel exists, schedule deletion after 5 seconds
    if (channelToClose) {
      const closeEmbed = new EmbedBuilder()
        .setColor(Colors.DARK)
        .setTitle("🔒 Ticket Closed")
        .setDescription(
          `This ticket has been marked as closed by <@${closedByUserId}>.\n` +
            `**Reason:** ${reason}\n\n` +
            `*This channel will be deleted automatically in 5 seconds.*`,
        );

      await channelToClose.send({ embeds: [closeEmbed] }).catch(() => null);
      setTimeout(() => {
        channelToClose.delete("Ticket closed").catch(() => null);
      }, 5000);
    }

    return updated;
  }

  /**
   * Retrieves ticket details by database ID.
   */
  async getTicket(id: string): Promise<TicketSummary | null> {
    return prisma.supportTicket.findUnique({ where: { id } });
  }

  /**
   * Retrieves ticket details by channel ID.
   */
  async getTicketByChannel(channelId: string): Promise<TicketSummary | null> {
    return prisma.supportTicket.findFirst({ where: { channelId } });
  }
}

export const ticketService = new TicketService();
