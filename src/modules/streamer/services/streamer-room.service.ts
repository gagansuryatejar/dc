/**
 * Streamer-Exclusive Voice Lounge Service for NEXUS AI.
 * Creates temporary dedicated creator voice rooms with host controls.
 */

import {
  Guild,
  GuildMember,
  ChannelType,
  PermissionFlagsBits,
  VoiceChannel,
} from "discord.js";
import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { sanitizeString } from "../../../security/validators.js";

const logger = createModuleLogger("streamer:rooms");

export class StreamerRoomService {
  /**
   * Creates a dedicated streamer voice lounge for a creator.
   */
  async createStreamerRoom(
    guild: Guild,
    member: GuildMember,
    customName?: string,
  ): Promise<VoiceChannel | null> {
    const channelName = customName
      ? sanitizeString(customName, 32)
      : `🔴 ${member.displayName}'s Stream Lounge`;

    try {
      const channel = await guild.channels.create({
        name: channelName,
        type: ChannelType.GuildVoice,
        permissionOverwrites: [
          {
            id: guild.roles.everyone.id,
            allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.Speak],
          },
          {
            id: member.id,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.Connect,
              PermissionFlagsBits.Speak,
              PermissionFlagsBits.PrioritySpeaker,
              PermissionFlagsBits.MuteMembers,
              PermissionFlagsBits.DeafenMembers,
              PermissionFlagsBits.MoveMembers,
            ],
          },
        ],
        reason: `Streamer voice room requested by ${member.user.tag}`,
      });

      // Register in temporary rooms table so auto-cleanup sweeps it when empty
      await prisma.tempVoiceChannel.create({
        data: {
          id: channel.id,
          guildId: guild.id,
          ownerId: member.id,
          name: channelName,
          isPrivate: false,
          userLimit: 0,
        },
      });

      logger.info({ guildId: guild.id, channelId: channel.id }, "Streamer room created");
      return channel;
    } catch (err) {
      logger.warn({ err, guildId: guild.id }, "Failed to create streamer voice room");
      return null;
    }
  }
}

export const streamerRoomService = new StreamerRoomService();
