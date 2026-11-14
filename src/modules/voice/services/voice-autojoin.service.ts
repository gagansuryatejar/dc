/**
 * Automatic Voice Joining & Sweet Companion Presence Engine for NEXUS AI.
 * Automatically connects to active voice channels, greets members with voice and text,
 * and cleanly disconnects when channels become empty.
 */

import { type VoiceBasedChannel, type GuildMember, EmbedBuilder } from "discord.js";
import { getVoiceConnection } from "@discordjs/voice";
import { heartConfigService } from "./heart-config.service.js";
import { heartPersonalityService } from "./heart-personality.service.js";
import { voiceAssistantService } from "./voice-assistant.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

const logger = createModuleLogger("voice:autojoin");

export class VoiceAutoJoinService {
  /** Timers for leaving empty channels keyed by guildId */
  private readonly disconnectTimers = new Map<string, NodeJS.Timeout>();
  /** Cooldown map to prevent spam greeting the same channel in quick succession */
  private readonly greetingCooldowns = new Map<string, number>();

  /**
   * Called when a voice channel state updates.
   */
  async handleVoiceUpdate(
    oldChannel: VoiceBasedChannel | null,
    newChannel: VoiceBasedChannel | null,
    member: GuildMember,
  ): Promise<void> {
    if (member.user.bot) return;

    // 1. MEMBER JOINED A VOICE CHANNEL
    if (newChannel && (!oldChannel || oldChannel.id !== newChannel.id)) {
      await this.onMemberJoinedChannel(newChannel, member);
    }

    // 2. MEMBER LEFT A VOICE CHANNEL
    if (oldChannel && (!newChannel || oldChannel.id !== newChannel.id)) {
      await this.onMemberLeftChannel(oldChannel);
    }
  }

  /**
   * Evaluates auto-joining and greeting when a member joins.
   */
  async onMemberJoinedChannel(channel: VoiceBasedChannel, member: GuildMember): Promise<void> {
    const guildId = channel.guild.id;

    // Clear any pending disconnect timer for this guild
    const pendingTimer = this.disconnectTimers.get(guildId);
    if (pendingTimer) {
      clearTimeout(pendingTimer);
      this.disconnectTimers.delete(guildId);
    }

    const settings = await heartConfigService.getGuildSettings(guildId);
    if (!settings.autojoinEnabled) {
      return; // Guild admin disabled auto-join
    }

    // Check whitelist if configured
    if (settings.allowedChannels.length > 0 && !settings.allowedChannels.includes(channel.id)) {
      return;
    }

    // Check exclusion blacklist
    if (settings.excludedChannels.includes(channel.id)) {
      return;
    }

    const existingConn = getVoiceConnection(guildId);
    // If already connected to another channel that still has other humans, do not interrupt
    if (existingConn && existingConn.joinConfig.channelId !== channel.id) {
      const activeChannel = channel.guild.channels.cache.get(existingConn.joinConfig.channelId || "") as VoiceBasedChannel | undefined;
      const humanCount = activeChannel?.members.filter((m) => !m.user.bot).size ?? 0;
      if (humanCount > 0) {
        return; // Stay with the active group
      }
    }

    // Join channel if not already in it
    try {
      if (!existingConn || existingConn.joinConfig.channelId !== channel.id) {
        logger.info({ guildId, channelId: channel.id, member: member.user.username }, "Auto-joining active voice channel");
        await voiceAssistantService.join(channel);
      }

      // Check greetings setting and cooldown (avoid spamming if people leave/rejoin rapidly)
      const now = Date.now();
      const lastGreet = this.greetingCooldowns.get(channel.id) ?? 0;
      if (settings.greetingsEnabled && now - lastGreet > 30_000) {
        this.greetingCooldowns.set(channel.id, now);
        await this.deliverGreeting(channel, member);
      }
    } catch (err) {
      logger.error({ err, guildId, channelId: channel.id }, "Error during auto-join or greeting sequence");
    }
  }

  /**
   * Delivers sweet greeting both in voice audio and text embed.
   */
  private async deliverGreeting(channel: VoiceBasedChannel, member: GuildMember): Promise<void> {
    try {
      const guildId = channel.guild.id;
      const userPrefs = await heartConfigService.getUserPreferences(guildId, member.id);
      const guildSettings = await heartConfigService.getGuildSettings(guildId);

      const personality = userPrefs.personality || guildSettings.defaultPersonality;
      const language = userPrefs.language || guildSettings.defaultLanguage;
      const humanCount = channel.members.filter((m) => !m.user.bot).size;

      const greetingText = await heartPersonalityService.generateGreeting({
        username: member.displayName || member.user.username,
        personality,
        language,
        memberCountInRoom: humanCount,
      });

      // 1. Text Card in Voice Channel Text Chat
      if (channel.isTextBased()) {
        const embed = new EmbedBuilder()
          .setColor(Colors.PRIMARY)
          .setAuthor({
            name: `NEXUS AI — Sweet Voice Companion`,
            iconURL: member.client.user?.displayAvatarURL(),
          })
          .setDescription(`**${member.displayName || member.user.username}** joined the channel!\n\n*"${greetingText}"*`)
          .setFooter({ text: `Interaction Style: ${personality.toUpperCase()} • ${FOOTER_TEXT}` })
          .setTimestamp();

        await (channel as any).send({ embeds: [embed] }).catch(() => null);
      }

      // 2. Synthesize Audio Speech Greeting if audio is supported
      if (!voiceAssistantService.isAudioBypassed()) {
        try {
          const audioResource = await heartPersonalityService.synthesizeSpeechAudio(greetingText, language);
          voiceAssistantService.playAudio(guildId, audioResource);
        } catch (audioErr) {
          logger.debug({ audioErr }, "Speech audio playback skipped or unhandled");
        }
      }
    } catch (err) {
      logger.error({ err, channelId: channel.id }, "Failed to generate sweet voice greeting");
    }
  }

  /**
   * Called when someone leaves; disconnects if empty to preserve HP All-in-One memory.
   */
  async onMemberLeftChannel(channel: VoiceBasedChannel): Promise<void> {
    const guildId = channel.guild.id;
    const connection = getVoiceConnection(guildId);
    if (!connection || connection.joinConfig.channelId !== channel.id) {
      return;
    }

    const humanCount = channel.members.filter((m) => !m.user.bot).size;
    if (humanCount === 0) {
      logger.info({ guildId, channelId: channel.id }, "Channel is empty of human members. Initiating 30s auto-leave countdown.");

      // Set 30-second disconnect timer
      const timer = setTimeout(() => {
        logger.info({ guildId }, "Auto-disconnecting from empty voice channel to conserve system resources.");
        voiceAssistantService.leave(guildId);
        this.disconnectTimers.delete(guildId);
      }, 30_000);

      this.disconnectTimers.set(guildId, timer);
    }
  }

  destroy(): void {
    for (const timer of this.disconnectTimers.values()) {
      clearTimeout(timer);
    }
    this.disconnectTimers.clear();
    this.greetingCooldowns.clear();
  }
}

export const voiceAutoJoinService = new VoiceAutoJoinService();
