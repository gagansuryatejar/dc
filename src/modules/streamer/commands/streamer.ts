/**
 * Streamer Slash Commands for NEXUS AI.
 * Handles /streamer profile, /streamer set, /streamer leaderboard, and /streamer room.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  GuildMember,
  EmbedBuilder,
} from "discord.js";
import { streamerService } from "../services/streamer.service.js";
import { streamerRoomService } from "../services/streamer-room.service.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { formatDuration } from "../../../utils/helpers.js";
import { type NexusCommand, PermissionLevel } from "../../../types/index.js";
import { STREAMER } from "../../../config/features.js";

export const streamerCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("streamer")
    .setDescription("Content creator profiles, stats, settings, and creator lounges")
    .addSubcommand((sub) =>
      sub
        .setName("profile")
        .setDescription("View a member's content creator profile and stream statistics")
        .addUserOption((opt) =>
          opt.setName("member").setDescription("Member to inspect (defaults to you)").setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("set")
        .setDescription("Configure your creator profile and notification preferences")
        .addStringOption((opt) =>
          opt
            .setName("platform")
            .setDescription("Primary streaming platform")
            .addChoices(
              { name: "Twitch", value: "Twitch" },
              { name: "YouTube", value: "YouTube" },
              { name: "Kick", value: "Kick" },
              { name: "Discord", value: "Discord" },
            )
            .setRequired(false),
        )
        .addStringOption((opt) =>
          opt.setName("url").setDescription("Your stream or channel URL").setRequired(false),
        )
        .addStringOption((opt) =>
          opt.setName("bio").setDescription("Short creator bio").setRequired(false),
        )
        .addStringOption((opt) =>
          opt.setName("message").setDescription("Custom go-live message").setRequired(false),
        )
        .addBooleanOption((opt) =>
          opt
            .setName("notify")
            .setDescription("Automatically announce when you go live (Streamer Protection)")
            .setRequired(false),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("leaderboard")
        .setDescription("View top server content creators by total stream airtime"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("room")
        .setDescription("Create a dedicated temporary voice lounge for your stream")
        .addStringOption((opt) =>
          opt.setName("name").setDescription("Custom voice room name").setRequired(false),
        ),
    ),
  module: STREAMER,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,
  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    const guildId = interaction.guildId!;

    // ── /streamer profile ─────────────────────────────────────
    if (sub === "profile") {
      const targetUser = interaction.options.getUser("member") || interaction.user;
      const profile = await streamerService.getProfile(guildId, targetUser.id);
      const activeSession = streamerService.getActiveSession(guildId, targetUser.id);

      const embed = new EmbedBuilder()
        .setColor(activeSession ? Colors.ACCENT : Colors.PRIMARY)
        .setTitle(`🎥 Creator Profile — ${targetUser.username}`)
        .setDescription(
          (profile.bio ? `*${profile.bio}*\n\n` : "") +
            `**Status:** ${activeSession ? "🔴 **STREAMING LIVE**" : "⚪ Offline"}\n` +
            `**Platform:** ${profile.platform || "Not specified"}\n` +
            (profile.channelUrl ? `**Channel URL:** [Visit Channel](${profile.channelUrl})\n` : "") +
            `**Auto-Announce:** ${profile.notifyGoLive ? "🟢 Enabled" : "🔴 Disabled (Silent Mode)"}\n\n` +
            `**Total Streams:** ${profile.totalStreams}\n` +
            `**Total Airtime:** ${formatDuration(profile.totalStreamMinutes * 60)}\n` +
            (profile.lastStreamAt
              ? `**Last Stream:** <t:${Math.floor(profile.lastStreamAt.getTime() / 1000)}:R>`
              : ""),
        )
        .setThumbnail(targetUser.displayAvatarURL({ size: 128 }))
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── /streamer set ─────────────────────────────────────────
    if (sub === "set") {
      const platform = interaction.options.getString("platform") || undefined;
      const channelUrl = interaction.options.getString("url") || undefined;
      const bio = interaction.options.getString("bio") || undefined;
      const customMessage = interaction.options.getString("message") || undefined;
      const notifyGoLive = interaction.options.getBoolean("notify");

      await streamerService.upsertProfile(guildId, interaction.user.id, {
        platform,
        channelUrl,
        bio,
        customMessage,
        notifyGoLive: notifyGoLive !== null ? notifyGoLive : undefined,
      });

      await interaction.reply({
        content:
          "✅ **Streamer Profile Updated!** Your channel links, bio, and privacy settings have been saved.",
        ephemeral: true,
      });
      return;
    }

    // ── /streamer leaderboard ─────────────────────────────────
    if (sub === "leaderboard") {
      const top = await streamerService.getLeaderboard(guildId, 10);

      if (top.length === 0) {
        await interaction.reply({
          content: "ℹ️ No streamer activity recorded yet in this server.",
          ephemeral: true,
        });
        return;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle("🏆 Top Community Streamers Leaderboard")
        .setDescription(
          top
            .map((s, idx) => {
              const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `**#${idx + 1}**`;
              return `${medal} <@${s.userId}> — **${formatDuration(s.totalStreamMinutes * 60)}** (${s.totalStreams} streams)`;
            })
            .join("\n"),
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── /streamer room ────────────────────────────────────────
    if (sub === "room") {
      const name = interaction.options.getString("name") || undefined;
      const member = interaction.member as GuildMember;

      if (!interaction.guild) return;

      const room = await streamerRoomService.createStreamerRoom(
        interaction.guild,
        member,
        name,
      );

      if (!room) {
        await interaction.reply({
          content: "❌ Unable to create stream lounge (insufficient permissions).",
          ephemeral: true,
        });
        return;
      }

      await interaction.reply({
        content: `🎉 **Stream Lounge Created:** <#${room.id}>! You have host speaker and moderation privileges in this room.`,
      });
      return;
    }
  },
};
