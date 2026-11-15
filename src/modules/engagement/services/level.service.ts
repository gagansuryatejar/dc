/**
 * NEXUS AI — Level & XP Progression Service
 * Quadratic XP curve: Level L requires 50 * L^2 + 50 * L XP total.
 * Anti-spam: 60-second cooldown per user for message XP.
 */

import { XP_COOLDOWN_MS, XP_MIN, XP_MAX } from "../../../utils/constants.js";

const userXpCooldowns = new Map<string, number>();

/** Calculate level and progress from total XP. */
export function calculateProgress(totalXp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progressPercent: number;
} {
  if (totalXp <= 0) {
    return { level: 0, currentLevelXp: 0, nextLevelXp: 100, progressPercent: 0 };
  }

  // Quadratic formula: xp = 50 * L^2 + 50 * L
  // Solve for L: 50L^2 + 50L - xp = 0
  // L = (-50 + sqrt(2500 + 200 * xp)) / 100
  const discriminant = 2500 + 200 * totalXp;
  const level = Math.floor((-50 + Math.sqrt(discriminant)) / 100);

  // XP needed to reach the START of this level
  const levelStartXp = 50 * level * level + 50 * level;
  // XP needed to reach the START of the next level
  const nextLevelXp = 50 * (level + 1) * (level + 1) + 50 * (level + 1);

  // currentLevelXp = XP within current level (total XP minus XP at start of level)
  const currentLevelXp = totalXp - levelStartXp;
  const progressPercent = Math.min(100, Math.max(0, (currentLevelXp / (nextLevelXp - levelStartXp)) * 100));

  return { level, currentLevelXp, nextLevelXp, progressPercent: Math.round(progressPercent * 100) / 100 };
}

/** Render a text-based progress bar.
 * @param currentXp - The current XP earned or percentage (0-100)
 * @param totalXp - The total XP needed or bar width (defaults to 12)
 * @param _width - Reserved for future use (legacy compatibility)
 */
export function renderProgressBar(currentXp: number, totalXp: number = 12, _width: number = 12): string {
  // If totalXp is provided as second arg and currentXp is >= 0 and <= 100, interpret as percentage
  const percent = Math.min(100, Math.max(0, currentXp));
  const actualWidth = Math.max(1, totalXp);
  const filled = Math.max(0, Math.min(actualWidth, Math.round((percent / 100) * actualWidth)));
  const empty = Math.max(0, actualWidth - filled);
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${Math.round(percent)}%`;
}

/** Check if user can earn message XP (anti-spam cooldown). */
export function canEarnMessageXp(userId: string): boolean {
  const now = Date.now();
  const lastEarned = userXpCooldowns.get(userId) || 0;
  if (now - lastEarned < XP_COOLDOWN_MS) {
    return false;
  }
  userXpCooldowns.set(userId, now);
  return true;
}

/** Get random XP for a qualifying message. */
export function getRandomMessageXp(): number {
  return Math.floor(Math.random() * (XP_MAX - XP_MIN + 1)) + XP_MIN;
}

/** Voice XP per minute. */
export const VOICE_XP_PER_MINUTE = 1;

/** Calculate XP needed for a specific level. */
export function getXpForLevel(level: number): number {
  return 50 * level * level + 50 * level;
}

/** Get all level thresholds up to a max level. */
export function getLevelThresholds(maxLevel = 50): number[] {
  return Array.from({ length: maxLevel + 1 }, (_, i) => getXpForLevel(i));
}

/** Service object for test compatibility. */
export const levelService = {
  calculateProgress,
  renderProgressBar,
  canEarnMessageXp,
  getRandomMessageXp,
  getXpForLevel,
  getLevelThresholds,
  VOICE_XP_PER_MINUTE,
};