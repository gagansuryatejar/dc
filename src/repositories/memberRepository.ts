/**
 * MemberRepository — Persistence for per-guild member records.
 * Records are scoped by (guildId, userId) to prevent data leakage between servers.
 */

import { prisma } from "../database/client.js";
import { logger } from "../utils/logger.js";

export type MemberInput = {
  guildId: string;
  userId: string;
  username: string;
  displayName?: string;
};

export type MemberUpdate = Partial<{
  username: string;
  displayName: string | null;
  xp: number;
  level: number;
  voiceMinutes: number;
  messageCount: number;
  coins: number;
  reputation: number;
  dailyStreak: number;
  lastDaily: Date | null;
  lastActive: Date;
  lastRepGiven: Date | null;
  birthday: string | null;
  bio: string | null;
  preferences: Record<string, unknown>;
  consentFlags: Record<string, unknown>;
}>;

export const memberRepository = {
  // Support both (guildId, userId, username) and ({ guildId, userId, username }) for backwards compatibility
  async findOrCreate(guildIdOrInput: string | MemberInput, userId?: string, username?: string) {
    const input: MemberInput = typeof guildIdOrInput === 'string'
      ? { guildId: guildIdOrInput, userId: userId!, username: username! }
      : guildIdOrInput;
    return prisma.guildMember.upsert({
      where: { guildId_userId: { guildId: input.guildId, userId: input.userId } },
      update: { username: input.username },
      create: {
        guildId: input.guildId,
        userId: input.userId,
        username: input.username,
        displayName: input.displayName ?? null,
      },
    });
  },

  async findByGuildAndUser(guildId: string, userId: string) {
    return prisma.guildMember.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });
  },

  async findById(id: string) {
    return prisma.guildMember.findUnique({ where: { id } });
  },

  async update(guildId: string, userId: string, data: MemberUpdate) {
    const updateData: Record<string, unknown> = { ...data };
    if (data.preferences !== undefined) {
      updateData.preferences = JSON.stringify(data.preferences);
    }
    if (data.consentFlags !== undefined) {
      updateData.consentFlags = JSON.stringify(data.consentFlags);
    }
    return prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: updateData,
    });
  },

  async incrementXp(guildId: string, userId: string, amount: number) {
    return prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: { xp: { increment: amount }, lastActive: new Date() },
    });
  },

  async incrementVoiceMinutes(guildId: string, userId: string, minutes: number) {
    return prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: { voiceMinutes: { increment: minutes }, lastActive: new Date() },
    });
  },

  async setLastActive(guildId: string, userId: string) {
    return prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: { lastActive: new Date() },
    });
  },

  async findTopByXp(guildId: string, limit = 10) {
    return prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { xp: "desc" },
      take: limit,
      select: { userId: true, username: true, xp: true, level: true },
    });
  },

  async findTopByVoice(guildId: string, limit = 10) {
    return prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { voiceMinutes: "desc" },
      take: limit,
      select: { userId: true, username: true, voiceMinutes: true },
    });
  },

  async findTopByVoiceMinutes(guildId: string, limit = 10) {
    return prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { voiceMinutes: "desc" },
      take: limit,
      select: { userId: true, username: true, voiceMinutes: true, xp: true, level: true, dailyStreak: true, reputation: true, coins: true, badges: true, birthday: true, bio: true },
    });
  },

  async findTopByReputation(guildId: string, limit = 10) {
    return prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { reputation: "desc" },
      take: limit,
      select: { userId: true, username: true, reputation: true, xp: true, level: true, dailyStreak: true, voiceMinutes: true, coins: true, badges: true, birthday: true, bio: true },
    });
  },

  async findTopByStreak(guildId: string, limit = 10) {
    return prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { dailyStreak: "desc" },
      take: limit,
      select: { userId: true, username: true, dailyStreak: true, xp: true, level: true, reputation: true, voiceMinutes: true, coins: true, badges: true, birthday: true, bio: true },
    });
  },

  async findTopByCoins(guildId: string, limit = 10) {
    return prisma.guildMember.findMany({
      where: { guildId },
      orderBy: { coins: "desc" },
      take: limit,
      select: { userId: true, username: true, coins: true, xp: true, level: true, dailyStreak: true, reputation: true, voiceMinutes: true, badges: true, birthday: true, bio: true },
    });
  },

  async countInGuild(guildId: string) {
    return prisma.guildMember.count({ where: { guildId } });
  },
};

logger.debug({ module: "memberRepository" }, "MemberRepository initialised");
