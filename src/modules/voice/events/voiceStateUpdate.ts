/**
 * NEXUS HEART — Voice State Update Event Handler
 * Handles bot auto-join, member greetings, idle detection, and XP rewards.
 */

import { Events } from "discord.js";
import { connectionManager } from "../services/connectionManager.js";
import { greetingService } from "../services/greeting.service.js";
import { memberRepository } from "../../../database/index.js";
import { levelService } from "../../../modules/engagement/services/level.service.js";
import { achievementService } from "../../../modules/engagement/services/achievement.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { VOICE_XP_PER_MINUTE } from "../../../modules/engagement/services/level.service.js";

const log = createModuleLogger("voice:voiceStateUpdate");

export const name = Events.VoiceStateUpdate;
export const once = false;

const BOT_ID = process.env.DISCORD_CLIENT_ID || "";

export async function execute(
  oldState: import("discord.js").VoiceState,
  newState: import("discord.js").VoiceState,
): Promise<void> {
  const guildId = oldState.guild.id;
  const userId = oldState.member?.user.id || newState.member?.user.id;

  if (!userId || !guildId) return;

  const isBot = userId === BOT_ID;
  const wasInChannel = !!oldState.channelId;
  const isInChannel = !!newState.channelId;

  log.debug(
    { userId, guildId, isBot, wasInChannel, isInChannel },
    "Voice state update",
  );

  if (isBot) {
    await handleBotVoiceState(guildId, oldState, newState);
    return;
  }

  const member = oldState.member || newState.member;
  if (!member || member.user.bot) return;

  await handleMemberVoiceState(guildId, userId, wasInChannel, isInChannel, member);
}

async function handleBotVoiceState(
  guildId: string,
  oldState: import("discord.js").VoiceState,
  newState: import("discord.js").VoiceState,
): Promise<void> {
  const wasInChannel = !!oldState.channelId;
  const isInChannel = !!newState.channelId;

  log.info({ guildId }, "Bot voice state changed");

  if (!wasInChannel && isInChannel) {
    await handleBotJoin(guildId, newState.channelId!);
  } else if (wasInChannel && !isInChannel) {
    connectionManager.leave(guildId);
    log.info({ guildId }, "Bot left voice channel");
  } else if (wasInChannel && isInChannel && oldState.channelId !== newState.channelId) {
    log.info({ guildId }, "Bot moved voice channels");
  }
}

async function handleBotJoin(
  guildId: string,
  channelId: string,
): Promise<void> {
  const connection = await connectionManager.joinOrCreate(guildId, channelId);
  if (connection) {
    log.info({ guildId, channelId }, "Bot joined voice channel");

    setTimeout(() => {
      connectionManager.startIdleDetection(guildId, channelId, channelId);
    }, 30_000);
  }
}

async function handleMemberVoiceState(
  guildId: string,
  userId: string,
  wasInChannel: boolean,
  isInChannel: boolean,
  member: import("discord.js").GuildMember,
): Promise<void> {
  const hasActiveConnection = connectionManager.hasActiveConnection(guildId);

  if (!wasInChannel && isInChannel) {
    await handleMemberJoinVoice(guildId, userId, member, hasActiveConnection);
  } else if (wasInChannel && !isInChannel) {
    await handleMemberLeaveVoice(guildId, userId);
  } else if (wasInChannel && isInChannel) {
    connectionManager.updateSpeakingMembers(guildId, userId, true);
  }
}

async function handleMemberJoinVoice(
  guildId: string,
  userId: string,
  member: import("discord.js").GuildMember,
  botInChannel: boolean,
): Promise<void> {
  const username = member.displayName || member.user.username;

  const memberRecord = await memberRepository.findByGuildAndUser(guildId, userId);

  if (!memberRecord) {
    await memberRepository.findOrCreate({
      guildId,
      userId,
      username,
    });
  }

  const voiceChannel = member.voice.channel;
  if (!voiceChannel) return;

  const textChannel = voiceChannel.guild.channels.cache.find(
    (c) => c.type === 0 && c.parentId === voiceChannel.parentId,
  ) as import("discord.js").TextChannel | undefined;

  const greetingChannelId = textChannel?.id || voiceChannel.id;

  const isReturning = greetingService.checkForReturningMember(member);

  if (isReturning) {
    await greetingService.greetReturningMember(username, guildId, greetingChannelId);
  }

  if (botInChannel) {
    await greetingService.processMemberJoin(member, greetingChannelId);
    connectionManager.resetIdleDetection(guildId);
  } else {
    await autoJoinOnFirstMember(guildId, userId, member, greetingChannelId);
  }

  await awardVoiceXpForActivity(guildId, userId);
}

async function autoJoinOnFirstMember(
  guildId: string,
  userId: string,
  member: import("discord.js").GuildMember,
  greetingChannelId: string,
): Promise<void> {
  const voiceChannel = member.voice.channel;
  if (!voiceChannel) return;

  const botId = process.env.DISCORD_CLIENT_ID;
  const otherMembers = voiceChannel.members?.filter((m) => !m.user.id.includes(botId || "")) ?? null;
  if (otherMembers && otherMembers.size > 0) return;

  const connection = await connectionManager.joinOrCreate(guildId, voiceChannel.id);
  if (connection) {
    log.info({ guildId, userId }, "Bot auto-joined on first member");

    await greetingService.processMemberJoin(member, greetingChannelId);
    connectionManager.resetIdleDetection(guildId);
  }
}

async function handleMemberLeaveVoice(guildId: string, userId: string): Promise<void> {
  connectionManager.updateSpeakingMembers(guildId, userId, false);

  const connectionInfo = connectionManager.getConnectionInfo(guildId);
  if (!connectionInfo) return;

  const voiceChannel = await getChannelFromId(guildId, connectionInfo.channelId);
  if (!voiceChannel) return;

  const botId = process.env.DISCORD_CLIENT_ID;
  const otherMembers = voiceChannel.members?.filter((m: any) => !m.user.id.includes(botId || "")) ?? null;
  if (otherMembers && otherMembers.size > 0) return;

  log.info({ guildId }, "Last member left, disconnecting");
  connectionManager.leave(guildId);
}

async function awardVoiceXpForActivity(guildId: string, userId: string): Promise<void> {
  await connectionManager.awardVoiceXp(guildId, userId, VOICE_XP_PER_MINUTE);

  const member = await memberRepository.findByGuildAndUser(guildId, userId);
  if (!member) return;

  const connectionInfo = connectionManager.getConnectionInfo(guildId);
  if (!connectionInfo) return;

  const stats = {
    messageCount: member.messageCount || 0,
    level: levelService.calculateProgress(member.xp).level,
    dailyStreak: member.dailyStreak || 0,
    reputation: member.reputation || 0,
    voiceMinutes: member.voiceMinutes || 0,
    hasBirthday: !!member.birthday,
    hasBio: !!member.bio,
    xp: member.xp,
    coins: member.coins || 0,
  };

  const { newlyUnlocked } = achievementService.evaluateBadges(JSON.stringify(member.badges || "[]"), stats);

  for (const badge of newlyUnlocked) {
    try {
      const channelId = connectionInfo.channelId;
      const { REST } = await import("@discordjs/rest");
      const { Routes } = await import("discord-api-types/v10");
      const config = await import("../../../config/index.js").then((m) => m.config);

      const rest = new REST({ version: "10" }).setToken(config.discord.token);

      await rest.post(Routes.channelMessages(channelId), {
        body: {
          content: `🎉 **Voice Milestone!** ${badge.emoji} **${badge.name}** — ${badge.description}`,
        },
      });
    } catch (error) {
      log.warn({ guildId }, "Failed to send milestone notification");
    }
  }
}

async function getChannelFromId(_guildId: string, channelId: string): Promise<any | null> {
  const { REST } = await import("@discordjs/rest");
  const { Routes } = await import("discord-api-types/v10");
  const config = await import("../../../config/index.js").then((m) => m.config);

  const rest = new REST({ version: "10" }).setToken(config.discord.token);

  try {
    return await rest.get(Routes.channel(channelId));
  } catch {
    return null;
  }
}