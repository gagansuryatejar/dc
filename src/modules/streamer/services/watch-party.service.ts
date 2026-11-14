/**
 * Watch Party Service for NEXUS AI.
 * Handles community watch party scheduling, RSVP list management,
 * live party announcements, and interactive Discord card components.
 */

import {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { prisma, auditRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { sanitizeString, validateUrl } from "../../../security/validators.js";

const logger = createModuleLogger("streamer:watchparty");

export interface WatchPartyData {
  id: string;
  guildId: string;
  hostId: string;
  title: string;
  description: string | null;
  streamUrl: string;
  voiceChannelId: string | null;
  scheduledFor: Date;
  status: string;
  rsvpUsers: string; // JSON array of user IDs
  createdAt: Date;
}

export class WatchPartyService {
  /**
   * Schedules a new community watch party.
   */
  async scheduleParty(
    guildId: string,
    hostId: string,
    title: string,
    streamUrl: string,
    scheduledFor: Date,
    description?: string,
    voiceChannelId?: string,
  ): Promise<WatchPartyData> {
    const cleanTitle = sanitizeString(title, 100);
    const cleanDesc = description ? sanitizeString(description, 500) : undefined;

    if (!validateUrl(streamUrl)) {
      throw new Error("Invalid stream URL provided.");
    }

    if (scheduledFor.getTime() <= Date.now()) {
      throw new Error("Scheduled time must be in the future.");
    }

    const party = await prisma.watchParty.create({
      data: {
        guildId,
        hostId,
        title: cleanTitle,
        description: cleanDesc,
        streamUrl,
        voiceChannelId: voiceChannelId ?? null,
        scheduledFor,
        status: "scheduled",
        rsvpUsers: JSON.stringify([hostId]), // Host automatically RSVP'd
      },
    });

    await auditRepository.create(guildId, "WATCHPARTY_SCHEDULE", {
      userId: hostId,
      target: party.id,
      details: `Scheduled watch party "${cleanTitle}" for ${scheduledFor.toISOString()}`,
      module: "streamer",
      severity: "info",
    });

    logger.info({ guildId, partyId: party.id, title: cleanTitle }, "Watch party scheduled");
    return party;
  }

  /**
   * Toggles a user's RSVP status for a watch party.
   */
  async toggleRsvp(partyId: string, userId: string): Promise<{ rsvpCount: number; isRsvpd: boolean }> {
    const party = await prisma.watchParty.findUnique({ where: { id: partyId } });
    if (!party) throw new Error("Watch party not found.");

    let list: string[] = [];
    try {
      list = JSON.parse(party.rsvpUsers);
    } catch {
      list = [];
    }

    let isRsvpd = false;
    if (list.includes(userId)) {
      list = list.filter((id) => id !== userId);
      isRsvpd = false;
    } else {
      list.push(userId);
      isRsvpd = true;
    }

    await prisma.watchParty.update({
      where: { id: partyId },
      data: { rsvpUsers: JSON.stringify(list) },
    });

    return { rsvpCount: list.length, isRsvpd };
  }

  /**
   * Retrieves upcoming scheduled watch parties for a guild.
   */
  async getUpcoming(guildId: string, limit = 5): Promise<WatchPartyData[]> {
    return prisma.watchParty.findMany({
      where: {
        guildId,
        status: { in: ["scheduled", "live"] },
        scheduledFor: { gte: new Date(Date.now() - 2 * 60 * 60 * 1000) }, // Include recent 2h
      },
      orderBy: { scheduledFor: "asc" },
      take: limit,
    });
  }

  /**
   * Updates party status to live or ended.
   */
  async updateStatus(partyId: string, status: "live" | "ended" | "cancelled"): Promise<WatchPartyData> {
    return prisma.watchParty.update({
      where: { id: partyId },
      data: { status },
    });
  }

  /**
   * Renders the interactive Discord embed and RSVP button for a watch party.
   */
  renderPartyCard(party: WatchPartyData): {
    embed: EmbedBuilder;
    row: ActionRowBuilder<ButtonBuilder>;
  } {
    let rsvpList: string[] = [];
    try {
      rsvpList = JSON.parse(party.rsvpUsers);
    } catch {
      rsvpList = [];
    }

    const timestampSec = Math.floor(party.scheduledFor.getTime() / 1000);

    const embed = new EmbedBuilder()
      .setColor(party.status === "live" ? Colors.ERROR : Colors.PRIMARY)
      .setTitle(`🍿 Community Watch Party: ${party.title}`)
      .setDescription(
        (party.description ? `${party.description}\n\n` : "") +
          `**Host:** <@${party.hostId}>\n` +
          `**Status:** ${party.status === "live" ? "🔴 **LIVE NOW**" : "🗓️ **Scheduled**"}\n` +
          `**Date & Time:** <t:${timestampSec}:F> (<t:${timestampSec}:R>)\n` +
          `**Stream Link:** [Watch Here](${party.streamUrl})\n` +
          (party.voiceChannelId ? `**Voice Room:** <#${party.voiceChannelId}>\n` : "") +
          `**Attendees:** ${rsvpList.length} member(s) confirmed`,
      )
      .setFooter({ text: FOOTER_TEXT })
      .setTimestamp();

    const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(`watchparty_rsvp_${party.id}`)
        .setLabel(`RSVP (${rsvpList.length})`)
        .setStyle(ButtonStyle.Success)
        .setEmoji("🎟️"),
      new ButtonBuilder()
        .setLabel("Tune In")
        .setStyle(ButtonStyle.Link)
        .setURL(party.streamUrl),
    );

    return { embed, row };
  }
}

export const watchPartyService = new WatchPartyService();
