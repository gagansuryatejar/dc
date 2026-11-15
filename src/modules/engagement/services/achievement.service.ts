/**
 * NEXUS AI — Achievement & Badge Service
 * Evaluates member stats against badge criteria, awards new badges, prevents duplicates.
 */

/** Badge definition with unlock criteria. */
export interface Badge {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "general" | "level" | "streak" | "social" | "voice" | "special";
  condition: (stats: BadgeEvalStats) => boolean;
}

export type { Badge as BadgeData };

/** Member stats for badge evaluation. */
export interface BadgeEvalStats {
  messageCount: number;
  level: number;
  dailyStreak: number;
  reputation: number;
  voiceMinutes: number;
  hasBirthday: boolean;
  hasBio: boolean;
  xp?: number;
  coins?: number;
}

/** Result of badge evaluation. */
export interface BadgeEvalResult {
  newlyUnlocked: Badge[];
  allUnlocked: string[];
}

/** Registry of all available badges. */
export const BADGE_REGISTRY: Record<string, Badge> = {
  // General badges
  first_words: {
    id: "first_words",
    name: "First Words",
    description: "Sent your first message in the server",
    emoji: "💬",
    category: "general",
    condition: (s) => s.messageCount >= 1,
  },
  chatterbox: {
    id: "chatterbox",
    name: "Chatterbox",
    description: "Sent 500 messages",
    emoji: "🗣️",
    category: "general",
    condition: (s) => s.messageCount >= 500,
  },
  conversationalist: {
    id: "conversationalist",
    name: "Conversationalist",
    description: "Sent 1,000 messages",
    emoji: "💭",
    category: "general",
    condition: (s) => s.messageCount >= 1000,
  },

  // Level badges
  level_5: {
    id: "level_5",
    name: "Rising Star",
    description: "Reached Level 5",
    emoji: "⭐",
    category: "level",
    condition: (s) => s.level >= 5,
  },
  level_10: {
    id: "level_10",
    name: "Dedicated Member",
    description: "Reached Level 10",
    emoji: "🌟",
    category: "level",
    condition: (s) => s.level >= 10,
  },
  level_25: {
    id: "level_25",
    name: "Community Pillar",
    description: "Reached Level 25",
    emoji: "🏆",
    category: "level",
    condition: (s) => s.level >= 25,
  },
  level_50: {
    id: "level_50",
    name: "Legend",
    description: "Reached Level 50",
    emoji: "👑",
    category: "level",
    condition: (s) => s.level >= 50,
  },

  // Streak badges
  streak_3: {
    id: "streak_3",
    name: "Consistent",
    description: "Maintained a 3-day daily streak",
    emoji: "🔥",
    category: "streak",
    condition: (s) => s.dailyStreak >= 3,
  },
  streak_7: {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day daily streak",
    emoji: "📅",
    category: "streak",
    condition: (s) => s.dailyStreak >= 7,
  },
  streak_30: {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day daily streak",
    emoji: "🏅",
    category: "streak",
    condition: (s) => s.dailyStreak >= 30,
  },

  // Social badges
  helpful_5: {
    id: "helpful_5",
    name: "Helpful",
    description: "Earned 5 reputation points",
    emoji: "🤝",
    category: "social",
    condition: (s) => s.reputation >= 5,
  },
  helpful_25: {
    id: "helpful_25",
    name: "Community Helper",
    description: "Earned 25 reputation points",
    emoji: "🫶",
    category: "social",
    condition: (s) => s.reputation >= 25,
  },
  birthday_buddy: {
    id: "birthday_buddy",
    name: "Birthday Buddy",
    description: "Set your birthday",
    emoji: "🎂",
    category: "social",
    condition: (s) => s.hasBirthday,
  },
  bio_writer: {
    id: "bio_writer",
    name: "Storyteller",
    description: "Wrote a bio about yourself",
    emoji: "📝",
    category: "social",
    condition: (s) => s.hasBio,
  },

  // Voice badges
  voice_30m: {
    id: "voice_30m",
    name: "Voice Visitor",
    description: "Spent 30 minutes in voice chat",
    emoji: "🎤",
    category: "voice",
    condition: (s) => s.voiceMinutes >= 30,
  },
  voice_2h: {
    id: "voice_2h",
    name: "Voice Regular",
    description: "Spent 2 hours in voice chat",
    emoji: "🎧",
    category: "voice",
    condition: (s) => s.voiceMinutes >= 120,
  },
  voice_10h: {
    id: "voice_10h",
    name: "Voice Veteran",
    description: "Spent 10 hours in voice chat",
    emoji: "📻",
    category: "voice",
    condition: (s) => s.voiceMinutes >= 600,
  },
};

/** Evaluate badges against member stats. */
export function evaluateBadges(
  currentBadgesJson: string,
  stats: BadgeEvalStats,
): BadgeEvalResult {
  let currentBadges: string[] = [];
  try {
    currentBadges = JSON.parse(currentBadgesJson || "[]");
  } catch {
    currentBadges = [];
  }

  const newlyUnlocked: Badge[] = [];
  const allUnlocked = [...currentBadges];

  for (const badge of Object.values(BADGE_REGISTRY)) {
    if (currentBadges.includes(badge.id)) continue;
    if (badge.condition(stats)) {
      newlyUnlocked.push(badge);
      allUnlocked.push(badge.id);
    }
  }

  return { newlyUnlocked, allUnlocked };
}

/** Get badge by ID. */
export function getBadge(id: string): Badge | undefined {
  return BADGE_REGISTRY[id];
}

/** Get badge by ID (alias). */
export const getBadgeById = getBadge;

/** Get all badges in a category. */
export function getBadgesByCategory(category: Badge["category"]): Badge[] {
  return Object.values(BADGE_REGISTRY).filter((b) => b.category === category);
}

/** Format badges for display. */
export function formatBadges(badgeIds: string[]): string {
  if (badgeIds.length === 0) return "No badges yet";
  return badgeIds
    .map((id) => {
      const badge = BADGE_REGISTRY[id];
      return badge ? `${badge.emoji} ${badge.name}` : id;
    })
    .join(", ");
}

/** Service object for test compatibility. */
export const achievementService = {
  evaluateBadges,
  getBadge,
  getBadgeById,
  getBadgesByCategory,
  formatBadges,
};