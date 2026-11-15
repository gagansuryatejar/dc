/**
 * NEXUS AI — Message Create Event (Engagement Module)
 * Handles XP gain from messages, anti-spam cooldown.
 */

import { Events } from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { calculateProgress, getRandomMessageXp, canEarnMessageXp, evaluateBadges } from "../services/index.js";
import { createModuleLogger } from "../../../utils/logger.js";

const log = createModuleLogger("engagement:messageCreate");

export const name = Events.MessageCreate;
export const once = false;

export async function execute(message: import("discord.js").Message): Promise<void> {
  // Ignore bots, DMs, and system messages
  if (message.author.bot || !message.inGuild() || message.system) return;

  const guildId = message.guildId;
  const userId = message.author.id;

  // Anti-spam XP cooldown
  if (!canEarnMessageXp(userId)) return;

  // Award random XP
  const xpGain = getRandomMessageXp();

  const member = await memberRepository.findOrCreate({ guildId, userId, username: message.author.username });
  const newXp = member.xp + xpGain;
  const newMessageCount = (member.messageCount || 0) + 1;

  // Check for new badges
  const oldBadges = JSON.parse(member.badges || "[]");
  const stats = {
    messageCount: newMessageCount,
    level: calculateProgress(newXp).level,
    dailyStreak: member.dailyStreak || 0,
    reputation: member.reputation || 0,
    voiceMinutes: member.voiceMinutes || 0,
    hasBirthday: !!member.birthday,
    hasBio: !!member.bio,
    xp: newXp,
    coins: member.coins || 0,
  };

  const { newlyUnlocked, allUnlocked } = evaluateBadges(JSON.stringify(oldBadges), stats);

  // Update member with new XP, message count, and lastActive
  await memberRepository.update(guildId, userId, {
    xp: newXp,
    messageCount: newMessageCount,
    lastActive: new Date(),
  });

  // Update badges in a separate call if new badges were earned
  if (newlyUnlocked.length > 0) {
    await memberRepository.update(guildId, userId, {
      badges: JSON.stringify(allUnlocked),
    } as any);
  }

  // Notify about new badges (send reply in channel)
  for (const badge of newlyUnlocked) {
    try {
      await message.reply({
        content: `🎉 **New Badge Unlocked!** ${badge.emoji} **${badge.name}** — ${badge.description}`,
      });
    } catch {
      // Ignore reply errors
    }
  }

  // Level up notification
  const oldLevel = calculateProgress(member.xp).level;
  const newLevel = calculateProgress(newXp).level;
  if (newLevel > oldLevel) {
    try {
      await message.reply({
        content: `🎊 **Level Up!** ${message.author} reached **Level ${newLevel}**!`,
      });
    } catch {
      // Ignore reply errors
    }
    log.info({ userId, guildId, oldLevel, newLevel }, "Member leveled up");
  }
}