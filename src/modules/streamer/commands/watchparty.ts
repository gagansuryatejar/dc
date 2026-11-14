/**
 * Watch Party Commands for NEXUS AI.
 * Handles /watchparty schedule, /watchparty list, and /watchparty rsvp.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
} from "discord.js";
import { watchPartyService } from "../services/watch-party.service.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { sanitizeString, validateUrl } from "../../../security/validators.js";
import { type NexusCommand, PermissionLevel } from "../../../types/index.js";
import { STREAMER } from "../../../config/features.js";

export const watchPartyCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("watchparty")
    .setDescription("Community watch parties and group stream viewing events")
    .addSubcommand((sub) =>
      sub
        .setName("schedule")
        .setDescription("Schedule an upcoming community watch party")
        .addStringOption((opt) =>
          opt.setName("title").setDescription("Event or stream title").setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Stream or video URL (Twitch, YouTube, etc.)").setRequired(true),
        )
        .addIntegerOption((opt) =>
          opt
            .setName("minutes")
            .setDescription("Minutes from now when the party starts (e.g. 60 for in 1 hour)")
            .setMinValue(1)
            .setMaxValue(43200) // 30 days max
            .setRequired(true),
        )
        .addStringOption((opt) =>
          opt.setName("description").setDescription("Event description or agenda").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("list")
        .setDescription("View all scheduled community watch parties"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("rsvp")
        .setDescription("RSVP to a scheduled watch party")
        .addStringOption((opt) =>
          opt.setName("party_id").setDescription("The Watch Party ID").setRequired(true),
        ),
    ),
  module: STREAMER,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // ── /watchparty schedule ──────────────────────────────────
    if (sub === "schedule") {
      const title = sanitizeString(interaction.options.getString("title", true), 100);
      const url = interaction.options.getString("url", true).trim();
      const minutes = interaction.options.getInteger("minutes", true);
      const description = interaction.options.getString("description") || undefined;

      if (!validateUrl(url)) {
        await interaction.reply({ content: "❌ Please provide a valid HTTP or HTTPS stream URL.", ephemeral: true });
        return;
      }

      const scheduledFor = new Date(Date.now() + minutes * 60 * 1000);

      try {
        const party = await watchPartyService.scheduleParty(
          guildId,
          interaction.user.id,
          title,
          url,
          scheduledFor,
          description,
        );

        const { embed, row } = watchPartyService.renderPartyCard(party);
        await interaction.reply({ embeds: [embed], components: [row] });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to schedule watch party";
        await interaction.reply({ content: `❌ ${msg}`, ephemeral: true });
      }
      return;
    }

    // ── /watchparty list ──────────────────────────────────────
    if (sub === "list") {
      const parties = await watchPartyService.getUpcoming(guildId, 5);

      if (parties.length === 0) {
        await interaction.reply({
          content: "ℹ️ No watch parties currently scheduled. Use `/watchparty schedule` to host one!",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle("🍿 Upcoming Community Watch Parties")
        .setDescription(
          parties
            .map((p) => {
              const timeSec = Math.floor(p.scheduledFor.getTime() / 1000);
              let rsvps: string[] = [];
              try {
                rsvps = JSON.parse(p.rsvpUsers);
              } catch {}
              return (
                `• **${p.title}** (ID: \`${p.id}\`)\n` +
                `  *Host: <@${p.hostId}> | Time: <t:${timeSec}:F> (<t:${timeSec}:R>) | RSVPs: ${rsvps.length}*\n` +
                `  [Link to Stream](${p.streamUrl})`
              );
            })
            .join("\n\n"),
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── /watchparty rsvp ──────────────────────────────────────
    if (sub === "rsvp") {
      const partyId = interaction.options.getString("party_id", true).trim();

      try {
        const { rsvpCount, isRsvpd } = await watchPartyService.toggleRsvp(
          partyId,
          interaction.user.id,
        );

        await interaction.reply({
          content: isRsvpd
            ? `🎟️ **RSVP Confirmed!** You are attending (Total RSVPs: ${rsvpCount}).`
            : `🎟️ **RSVP Withdrawn.** (Total RSVPs: ${rsvpCount}).`,
          ephemeral: true,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to update RSVP";
        await interaction.reply({ content: `❌ ${msg}`, ephemeral: true });
      }
      return;
    }
  },
};
