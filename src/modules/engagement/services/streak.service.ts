/**
 * NEXUS AI — Daily Rewards & Streak Service
 * 24-hour cooldown, streak increments on consecutive days, resets after 48h gap.
 * Base rewards: 120 XP + 50 coins, scaling with streak.
 */

import { DAILY_COOLDOWN_MS } from "../../../utils/constants.js";

/** Result of a daily claim calculation. */
export interface DailyClaimResult {
  success: boolean;
  newStreak: number;
  xpEarned: number;
  coinsEarned: number;
  cooldownRemainingMs?: number;
  message: string;
}

/** Calculate daily claim based on last claim date and current streak. */
export function calculateClaim(
  lastClaimAt: Date | null,
  currentStreak: number,
): DailyClaimResult {
  const now = Date.now();

  // First claim ever
  if (!lastClaimAt) {
    return {
      success: true,
      newStreak: 1,
      xpEarned: 120,
      coinsEarned: 50,
      message: "First daily claim! Welcome to your streak journey!",
    };
  }

  const timeSinceLastClaim = now - lastClaimAt.getTime();

  // Within 24h cooldown
  if (timeSinceLastClaim < DAILY_COOLDOWN_MS) {
    return {
      success: false,
      newStreak: currentStreak,
      xpEarned: 0,
      coinsEarned: 0,
      cooldownRemainingMs: DAILY_COOLDOWN_MS - timeSinceLastClaim,
      message: `Daily reward on cooldown. Try again in ${Math.ceil((DAILY_COOLDOWN_MS - timeSinceLastClaim) / 3600000)}h.`,
    };
  }

  // 24h - 48h: streak continues
  if (timeSinceLastClaim < DAILY_COOLDOWN_MS * 2) {
    const newStreak = currentStreak + 1;
    const streakBonus = Math.min(newStreak * 10, 500); // Cap bonus at 500
    return {
      success: true,
      newStreak,
      xpEarned: 120 + streakBonus,
      coinsEarned: 50 + Math.min(newStreak * 5, 250),
      message: `Daily claimed! Streak: ${newStreak} day${newStreak > 1 ? "s" : ""} 🔥`,
    };
  }

  // 48h+: streak resets to 1
  return {
    success: true,
    newStreak: 1,
    xpEarned: 120,
    coinsEarned: 50,
    message: "Streak reset! Starting fresh at Day 1.",
  };
}

/** Format cooldown remaining into human-readable string. */
export function formatCooldown(ms: number): string {
  if (ms <= 0) return "Ready";
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

/** Service object for test compatibility. */
export const streakService = {
  calculateClaim,
  formatCooldown,
};