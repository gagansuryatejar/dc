/**
 * NEXUS HEART — /voice command
 * Join voice channel with NEXUS HEART companion.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  type TextChannel,
} from "discord.js";
import { connectionManager } from "../services/connectionManager.js";
import { greetingService } from "../services/greeting.service.js";
import { createModuleLogger } from "../../../utils/logger.js";

const log = createModuleLogger("voice:command");

export const data = new SlashCommandBuilder()
  .setName("voice")
  .setDescription("Bring NEXUS HEART to your voice channel")
  .setDefaultMemberPermissions(PermissionFlagsBits.Connect);

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  const member = interaction.member as import("discord.js").GuildMember;
  const guildId = interaction.guildId!;

  if (!member.voice.channel) {
    await interaction.reply({
      content: "You need to be in a voice channel to use this command.",
      flags: 64,
    });
    return;
  }

  const channelId = member.voice.channel.id;

  await interaction.deferReply({ ephemeral: true });

  const connection = await connectionManager.joinOrCreate(guildId, channelId);

  if (!connection) {
    await interaction.editReply({
      content: "Failed to join voice channel. Please check my permissions.",
    });
    return;
  }

  const username = member.displayName || member.user.username;

  const greeting = await greetingService.generateGreeting({
    guildId,
    channelId,
    userId: member.user.id,
    username,
    isFirstJoin: true,
    lastActive: null,
    isBirthday: false,
    isReturning: false,
  });

  try {
    const textChannel = interaction.channel as TextChannel;
    if (textChannel?.isTextBased()) {
      await textChannel.send({
        content: greeting.content,
        tts: greeting.tts,
      });
    }
  } catch (error) {
    log.warn({ guildId, error }, "Could not send greeting text");
  }

  await interaction.editReply({
    content: `✅ NEXUS HEART has joined your voice channel in **${member.voice.channel?.name || "voice"}**. Use \` /settings voice idle 30 \` to adjust idle timeout.`,
  });

  log.info({ guildId, userId: member.user.id, channelId }, "User invoked /voice command");
}