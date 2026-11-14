/**
 * Temporary voice room manager for NEXUS AI.
 * Handles dynamic channel creation, private access permissions, and automated cleanup of abandoned rooms.
 */

import {
  type Guild,
  type GuildMember,
  ChannelType,
  PermissionFlagsBits,
  type VoiceChannel,
} from "discord.js";
import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { sanitizeString } from "../../../security/validators.js";

const logger = createModuleLogger("voice:temp-rooms");

export interface CreateRoomOptions {
  name?: string;
  userLimit?: number;
  isPrivate?: boolean;
}

export class TempRoomService {
  /**
   * Creates a dynamic temporary voice room for a member.
   */
  async createRoom(
    guild: Guild,
    owner: GuildMember,
    options: CreateRoomOptions = {},
  ): Promise<VoiceChannel> {
    const rawName = options.name || `${owner.displayName}'s Lounge`;
    const channelName = sanitizeString(rawName, 32);
    const userLimit = options.userLimit ? Math.max(0, Math.min(99, options.userLimit)) : 0;
    const isPrivate = Boolean(options.isPrivate);

    // Compute permission overwrites
    const permissionOverwrites = [
      {
        id: owner.id,
        allow: [
          PermissionFlagsBits.Connect,
          PermissionFlagsBits.Speak,
          PermissionFlagsBits.Stream,
          PermissionFlagsBits.MoveMembers,
        ],
      },
    ];

    if (isPrivate) {
      permissionOverwrites.push({
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.Connect],
      } as any);
    }

    // Create the voice channel in Discord
    const channel = await guild.channels.create({
      name: channelName,
      type: ChannelType.GuildVoice,
      userLimit,
      permissionOverwrites,
    });

    // Save persistence record in SQLite
    await prisma.tempVoiceChannel.create({
      data: {
        id: channel.id,
        guildId: guild.id,
        ownerId: owner.id,
        name: channelName,
        isPrivate,
        userLimit,
      },
    });

    logger.info({ guildId: guild.id, channelId: channel.id, ownerId: owner.id }, "Created temporary voice channel");

    // Move owner if they are already in voice
    if (owner.voice.channel) {
      await owner.voice.setChannel(channel).catch(() => null);
    }

    return channel;
  }

  /**
   * Evaluates if an empty voice channel is a managed temporary room and cleans it up.
   */
  async handleRoomState(guild: Guild, channelId: string): Promise<boolean> {
    try {
      const tempRecord = await prisma.tempVoiceChannel.findUnique({
        where: { id: channelId },
      });

      if (!tempRecord) return false;

      const channel = guild.channels.cache.get(channelId);
      if (!channel || (channel.isVoiceBased() && channel.members.size === 0)) {
        logger.info({ guildId: guild.id, channelId }, "Cleaning up abandoned temporary voice channel");

        if (channel) {
          await channel.delete("Automatic NEXUS AI temporary voice channel cleanup").catch(() => null);
        }

        await prisma.tempVoiceChannel.delete({ where: { id: channelId } }).catch(() => null);
        return true;
      }

      return false;
    } catch (error) {
      logger.error({ error, channelId }, "Error during temporary voice room cleanup check");
      return false;
    }
  }

  /**
   * Sweeps SQLite records against active Discord guild channels on startup.
   */
  async sweepAbandonedRooms(guild: Guild): Promise<number> {
    try {
      const records = await prisma.tempVoiceChannel.findMany({
        where: { guildId: guild.id },
      });

      let cleaned = 0;
      for (const rec of records) {
        const channel = guild.channels.cache.get(rec.id);
        if (!channel || (channel.isVoiceBased() && channel.members.size === 0)) {
          if (channel) {
            await channel.delete("Startup sweep of empty temporary voice channel").catch(() => null);
          }
          await prisma.tempVoiceChannel.delete({ where: { id: rec.id } }).catch(() => null);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.info({ guildId: guild.id, count: cleaned }, "Completed startup sweep of temporary voice channels");
      }
      return cleaned;
    } catch (err) {
      logger.error({ err, guildId: guild.id }, "Error during abandoned voice room sweep");
      return 0;
    }
  }
}

export const tempRoomService = new TempRoomService();
