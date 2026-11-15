/**
 * NEXUS HEART — Greeting Engine
 * Greets members by name with birthday/returning member detection.
 * Uses TTS for voice greetings with female, soft, sweet Indian English accent.
 */

import {
  type GuildMember as DiscordGuildMember,
} from "discord.js";
import { getTtsService } from "./tts.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { birthdayService } from "../../../modules/engagement/services/birthday.service.js";
import { memberRepository } from "../../../database/index.js";

const log = createModuleLogger("voice:greeting");

export interface GreetingContext {
  guildId: string;
  channelId: string;
  userId: string;
  username: string;
  isFirstJoin: boolean;
  lastActive: Date | null;
  isBirthday: boolean;
  isReturning: boolean;
}

export interface VoiceGreeting {
  content: string;
  tts: boolean;
  speakInVoice: boolean;
}

const RETURNING_THRESHOLD_DAYS = 7;

export class NexusHeartGreetingService {
  private lastActiveTrackers = new Map<string, number>();

  async generateGreeting(context: GreetingContext): Promise<VoiceGreeting> {
    const parts: string[] = [];

    if (context.isFirstJoin) {
      parts.push(`Welcome to the server, ${context.username}!`);
    } else if (context.isBirthday) {
      parts.push(`Happy Birthday, ${context.username}! 🎉`);
    } else if (context.isReturning) {
      parts.push(`Welcome back, ${context.username}!`);
    } else {
      parts.push(`Hello, ${context.username}!`);
    }

    if (context.isFirstJoin) {
      parts.push("I'm NEXUS HEART - your AI voice companion. Feel free to explore and chat with the community!");
    } else {
      parts.push("I'm NEXUS HEART - here to welcome you and keep you company.");
    }

    if (context.isBirthday) {
      parts.push("May your day be filled with joy and great conversations!");
    }

    const content = parts.join(" ");
    return {
      content,
      tts: true,
      speakInVoice: true,
    };
  }

  async sendTextGreeting(greeting: VoiceGreeting, textChannelId: string): Promise<void> {
    const { REST } = await import("@discordjs/rest");
    const { Routes } = await import("discord-api-types/v10");
    const config = await import("../../../config/index.js").then((m) => m.config);

    const rest = new REST({ version: "10" }).setToken(config.discord.token);

    try {
      await rest.post(Routes.channelMessages(textChannelId), {
        body: {
          content: greeting.content,
          tts: greeting.tts,
        },
      });
    } catch (error) {
      log.error({ textChannelId, error }, "Failed to send text greeting");
    }
  }

  async generateVoiceGreeting(context: GreetingContext): Promise<Buffer | null> {
    const greeting = await this.generateGreeting(context);
    const ttsService = getTtsService();

    return ttsService.speak(greeting.content, {
      language: "en",
      speed: 0.95,
      pitch: 1.1,
      volume: 1.0,
    });
  }

  async processMemberJoin(
    member: DiscordGuildMember,
    textChannelId: string,
  ): Promise<VoiceGreeting | null> {
    const guildId = member.guild.id;
    const userId = member.id;
    const username = member.displayName || member.user.username;

    await memberRepository.findOrCreate({ guildId, userId, username: member.displayName || username });

    const memberRecord = await memberRepository.findByGuildAndUser(guildId, userId);

    const isBirthday = memberRecord?.birthday ? birthdayService.isBirthdayToday(memberRecord.birthday) : false;

    const now = Date.now();
    const lastJoined = this.lastActiveTrackers.get(`${guildId}-${userId}`) || 0;
    const isReturning = lastJoined > 0 && (now - lastJoined) < RETURNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;

    this.lastActiveTrackers.set(`${guildId}-${userId}`, now);
    await memberRepository.update(guildId, userId, {
      lastActive: new Date(),
    } as any);

    const context: GreetingContext = {
      guildId,
      channelId: textChannelId,
      userId,
      username,
      isFirstJoin: !memberRecord,
      lastActive: memberRecord?.lastActive || null,
      isBirthday,
      isReturning,
    };

    log.info({ userId, username, isBirthday, isReturning }, "Processing member join greeting");

    const greeting = await this.generateGreeting(context);
    await this.sendTextGreeting(greeting, textChannelId);

    return greeting;
  }

  checkForReturningMember(member: DiscordGuildMember): boolean {
    const guildId = member.guild.id;
    const userId = member.id;
    const key = `${guildId}-${userId}`;

    const lastTime = this.lastActiveTrackers.get(key) || 0;
    const now = Date.now();

    if (now - lastTime > RETURNING_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) {
      this.lastActiveTrackers.set(key, now);
      return true;
    }

    return false;
  }

  async greetReturningMember(username: string, guildId: string, textChannelId: string): Promise<void> {
    const greeting: VoiceGreeting = {
      content: `Welcome back, ${username}! I've missed our conversations. 🎵`,
      tts: true,
      speakInVoice: true,
    };

    await this.sendTextGreeting(greeting, textChannelId);
    log.debug({ guildId, username }, "Sent returning member greeting");
  }

  getGreetingForXpEvent(
    _userId: string,
    username: string,
    xpAmount: number,
  ): VoiceGreeting {
    return {
      content: `${username} earned ${xpAmount} XP for participating!`,
      tts: false,
      speakInVoice: false,
    };
  }
}

export const greetingService = new NexusHeartGreetingService();