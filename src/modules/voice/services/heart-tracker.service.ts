/**
 * Sweet Voice Appreciation & Heart Milestone Engine for NEXUS AI.
 * Tracks member voice presence, enforces active-participation fair play rules,
 * celebrates progressive milestones (15m, 30m, 1h, 2h, 3h, 5h), and awards badges & coins.
 */

import { type Client, EmbedBuilder } from "discord.js";
import { prisma, memberRepository } from "../../../database/index.js";
import { heartPersonalityService } from "./heart-personality.service.js";
import { heartConfigService } from "./heart-config.service.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";

const logger = createModuleLogger("voice:heart-tracker");

export interface HeartMilestoneConfig {
  key: string;
  name: string;
  minutes: number;
  xp: number;
  coins: number;
  badgeId?: string;
  emoji: string;
  description: string;
}

export const HEART_MILESTONES: HeartMilestoneConfig[] = [
  {
    key: "15m",
    name: "First Hello",
    minutes: 15,
    xp: 50,
    coins: 25,
    badgeId: "first_hello",
    emoji: "🌸",
    description: "You're making our community brighter! ❤️",
  },
  {
    key: "30m",
    name: "Voice Buddy",
    minutes: 30,
    xp: 100,
    coins: 50,
    badgeId: "voice_buddy",
    emoji: "🎙️",
    description: "Aww! Glad you're hanging out with us!",
  },
  {
    key: "1h",
    name: "Golden Friend",
    minutes: 60,
    xp: 200,
    coins: 100,
    badgeId: "golden_friend",
    emoji: "⭐",
    description: "One hour together! You're amazing!",
  },
  {
    key: "2h",
    name: "Super Companion",
    minutes: 120,
    xp: 350,
    coins: 175,
    badgeId: "super_companion",
    emoji: "🌟",
    description: "You're an important part of this community!",
  },
  {
    key: "3h",
    name: "Community Star",
    minutes: 180,
    xp: 500,
    coins: 250,
    badgeId: "community_star",
    emoji: "✨",
    description: "Sending you a big appreciation! ⭐",
  },
  {
    key: "5h",
    name: "Legendary Friend",
    minutes: 300,
    xp: 1000,
    coins: 500,
    badgeId: "heart_legend",
    emoji: "👑",
    description: "You're officially a NEXUS legend!",
  },
];

export interface ActiveHeartSession {
  guildId: string;
  userId: string;
  username: string;
  channelId: string;
  joinedAt: number;
  lastActiveAt: number;
  serverDeaf: boolean;
  channelOccupancy: number;
}

export class HeartTrackerService {
  /** Map of active sessions keyed by "guildId:userId" */
  private readonly sessions = new Map<string, ActiveHeartSession>();
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    // Check milestones every 60 seconds
    this.checkInterval = setInterval(() => this.evaluateActiveSessions(), 60_000);
    if (this.checkInterval.unref) this.checkInterval.unref();
  }

  private getKey(guildId: string, userId: string): string {
    return `${guildId}:${userId}`;
  }

  /**
   * Called when a member joins a voice channel.
   */
  onMemberJoin(guildId: string, userId: string, username: string, channelId: string, serverDeaf: boolean, occupancy: number): void {
    const key = this.getKey(guildId, userId);
    this.sessions.set(key, {
      guildId,
      userId,
      username,
      channelId,
      joinedAt: Date.now(),
      lastActiveAt: Date.now(),
      serverDeaf,
      channelOccupancy: occupancy,
    });
    logger.debug({ guildId, userId, channelId }, "Heart voice session registered");
  }

  /**
   * Called when a member's voice state updates (deaf, mute, channel switch).
   */
  onVoiceStateChange(guildId: string, userId: string, serverDeaf: boolean, occupancy: number): void {
    const session = this.sessions.get(this.getKey(guildId, userId));
    if (session) {
      session.serverDeaf = serverDeaf;
      session.channelOccupancy = occupancy;
    }
  }

  /**
   * Called when a member leaves a voice channel.
   */
  async onMemberLeave(_client: Client | undefined, guildId: string, userId: string): Promise<number> {
    const key = this.getKey(guildId, userId);
    const session = this.sessions.get(key);
    if (!session) return 0;

    const sessionMinutes = Math.floor((Date.now() - session.joinedAt) / 60_000);
    this.sessions.delete(key);

    if (sessionMinutes > 0) {
      await this.recordParticipationTime(guildId, userId, sessionMinutes);
    }

    return sessionMinutes;
  }

  /**
   * Evaluates active sessions periodically and awards unlocked milestones.
   */
  async evaluateActiveSessions(client?: Client): Promise<void> {
    const now = Date.now();

    for (const session of this.sessions.values()) {
      // Fair-play anti-exploit rule: if user is server-deafened, skip milestone evaluation
      if (session.serverDeaf) {
        continue;
      }

      const elapsedMinutes = Math.floor((now - session.joinedAt) / 60_000);
      if (elapsedMinutes < 15) continue;

      for (const milestone of HEART_MILESTONES) {
        if (elapsedMinutes >= milestone.minutes) {
          await this.checkAndAwardMilestone(client, session, milestone, elapsedMinutes);
        }
      }
    }
  }

  /**
   * Checks if a milestone has already been claimed; if not, grants rewards and celebrates.
   */
  async checkAndAwardMilestone(
    client: Client | undefined,
    session: ActiveHeartSession,
    milestone: HeartMilestoneConfig,
    totalMinutes: number,
  ): Promise<boolean> {
    const { guildId, userId, username } = session;

    // Check duplicate claim in SQLite
    const existing = await prisma.heartReward.findUnique({
      where: {
        guildId_userId_milestone: {
          guildId,
          userId,
          milestone: milestone.key,
        },
      },
    });

    if (existing) {
      return false; // Already awarded!
    }

    // Record claim atomically in SQLite
    await prisma.heartReward.create({
      data: {
        guildId,
        userId,
        milestone: milestone.key,
        rewardType: "milestone",
        rewardValue: milestone.name,
        xpAwarded: milestone.xp,
        coinsAwarded: milestone.coins,
      },
    });

    // Award XP, Coins, and Badges to GuildMember
    const member = await memberRepository.findOrCreate(guildId, userId, username);
    const updatedXp = member.xp + milestone.xp;
    const updatedCoins = member.coins + milestone.coins;

    const badges: string[] = JSON.parse(member.badges || "[]");
    if (milestone.badgeId && !badges.includes(milestone.badgeId)) {
      badges.push(milestone.badgeId);
    }

    await prisma.guildMember.update({
      where: { guildId_userId: { guildId, userId } },
      data: {
        xp: updatedXp,
        coins: updatedCoins,
        badges: JSON.stringify(badges),
      },
    });

    logger.info(
      { guildId, userId, milestone: milestone.name, xp: milestone.xp, coins: milestone.coins },
      "Heart Voice Milestone awarded",
    );

    // Deliver celebration to voice channel text or user DM
    if (client) {
      await this.deliverCelebration(client, session, milestone, totalMinutes);
    }

    return true;
  }

  /**
   * Delivers celebration card and plays voice TTS.
   */
  private async deliverCelebration(
    client: Client,
    session: ActiveHeartSession,
    milestone: HeartMilestoneConfig,
    totalMinutes: number,
  ): Promise<void> {
    try {
      const { guildId, userId, username, channelId } = session;
      const userPrefs = await heartConfigService.getUserPreferences(guildId, userId);
      const guildSettings = await heartConfigService.getGuildSettings(guildId);

      const appreciationText = await heartPersonalityService.generateAppreciation({
        username,
        milestoneName: milestone.name,
        durationMinutes: totalMinutes,
        personality: userPrefs.personality || guildSettings.defaultPersonality,
        language: userPrefs.language || guildSettings.defaultLanguage,
      });

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`${milestone.emoji} Heart Milestone Unlocked: ${milestone.name}!`)
        .setDescription(
          `**${username}** has spent **${milestone.minutes} minutes** hanging out in voice!\n\n` +
          `*"${appreciationText}"*\n\n` +
          `**Rewards Earned:**\n` +
          `• **+${milestone.xp}** Voice XP\n` +
          `• **+${milestone.coins}** Virtual Coins\n` +
          `${milestone.badgeId ? `• **Unlocked Badge:** \`${milestone.name}\`\n` : ""}`,
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      const guild = client.guilds.cache.get(guildId);
      const channel = guild?.channels.cache.get(channelId);

      if (channel && channel.isTextBased()) {
        await (channel as any).send({
          content: userPrefs.appreciationPings ? `<@${userId}>` : undefined,
          embeds: [embed],
        });
      }
    } catch (err) {
      logger.error({ err, session }, "Failed to deliver milestone celebration");
    }
  }

  /**
   * Persists accumulated voice time to database and daily metrics.
   */
  private async recordParticipationTime(guildId: string, userId: string, minutes: number): Promise<void> {
    try {
      await prisma.guildMember.update({
        where: { guildId_userId: { guildId, userId } },
        data: {
          voiceMinutes: { increment: minutes },
          lastActive: new Date(),
        },
      });

      const today = new Date().toISOString().split("T")[0];
      await prisma.dailyMetric.upsert({
        where: { guildId_date: { guildId, date: today } },
        create: { guildId, date: today, voiceMinutes: minutes },
        update: { voiceMinutes: { increment: minutes } },
      });
    } catch (err) {
      logger.error({ err, guildId, userId }, "Failed to record voice participation time");
    }
  }

  /**
   * Retrieves full heart stats for a member.
   */
  async getMemberHeartStats(guildId: string, userId: string, username: string) {
    const member = await memberRepository.findOrCreate(guildId, userId, username);
    const rewards = await prisma.heartReward.findMany({
      where: { guildId, userId },
    });

    const claimedKeys = new Set(rewards.map((r) => r.milestone));
    const activeKey = this.getKey(guildId, userId);
    const activeSession = this.sessions.get(activeKey);
    const activeSessionMinutes = activeSession ? Math.floor((Date.now() - activeSession.joinedAt) / 60_000) : 0;

    const milestonesWithStatus = HEART_MILESTONES.map((m) => ({
      ...m,
      unlocked: claimedKeys.has(m.key),
      progressPercent: Math.min(100, Math.round(((activeSessionMinutes || member.voiceMinutes) / m.minutes) * 100)),
    }));

    const userPrefs = await heartConfigService.getUserPreferences(guildId, userId);

    return {
      userId,
      username: member.username,
      totalVoiceMinutes: member.voiceMinutes,
      activeSessionMinutes,
      isCurrentlyInVoice: Boolean(activeSession),
      coins: member.coins,
      xp: member.xp,
      level: member.level,
      personality: userPrefs.personality,
      claimedMilestonesCount: rewards.length,
      totalMilestonesCount: HEART_MILESTONES.length,
      milestones: milestonesWithStatus,
    };
  }

  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }
    this.sessions.clear();
  }
}

export const heartTrackerService = new HeartTrackerService();
