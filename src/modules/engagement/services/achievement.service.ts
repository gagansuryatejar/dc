/**
 * Achievement and badge evaluation engine for NEXUS AI.
 */

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  emoji: string;
  category: "progression" | "streak" | "social" | "voice";
}

export const BADGE_REGISTRY: Record<string, BadgeDefinition> = {
  first_words: {
    id: "first_words",
    name: "First Words",
    description: "Sent your first message in the community",
    emoji: "🌱",
    category: "progression",
  },
  level_5: {
    id: "level_5",
    name: "Rising Star",
    description: "Attained Community Level 5",
    emoji: "⭐",
    category: "progression",
  },
  level_10: {
    id: "level_10",
    name: "Community Pillar",
    description: "Attained Community Level 10",
    emoji: "🌟",
    category: "progression",
  },
  level_25: {
    id: "level_25",
    name: "Server Veteran",
    description: "Attained Community Level 25",
    emoji: "👑",
    category: "progression",
  },
  level_50: {
    id: "level_50",
    name: "Nexus Legend",
    description: "Attained Community Level 50",
    emoji: "⚡",
    category: "progression",
  },
  streak_3: {
    id: "streak_3",
    name: "Consistent Contributor",
    description: "Maintained a 3-day daily streak",
    emoji: "🔥",
    category: "streak",
  },
  streak_7: {
    id: "streak_7",
    name: "Weekly Champion",
    description: "Maintained a 7-day daily streak",
    emoji: "🏆",
    category: "streak",
  },
  streak_30: {
    id: "streak_30",
    name: "Iron Will",
    description: "Maintained a 30-day daily streak",
    emoji: "💎",
    category: "streak",
  },
  helpful_5: {
    id: "helpful_5",
    name: "Helpful Hand",
    description: "Earned 5 community reputation endorsements",
    emoji: "🤝",
    category: "social",
  },
  helpful_20: {
    id: "helpful_20",
    name: "Community Hero",
    description: "Earned 20 community reputation endorsements",
    emoji: "🛡️",
    category: "social",
  },
  voice_30m: {
    id: "voice_30m",
    name: "Voice Explorer",
    description: "Spent 30 minutes in server voice channels",
    emoji: "🎙️",
    category: "voice",
  },
  voice_3h: {
    id: "voice_3h",
    name: "Voice Champion",
    description: "Spent 3 hours in server voice channels",
    emoji: "📻",
    category: "voice",
  },
  birthday_registered: {
    id: "birthday_registered",
    name: "Celebrant",
    description: "Registered your birthday with NEXUS AI",
    emoji: "🎂",
    category: "social",
  },
  introducer: {
    id: "introducer",
    name: "Introduced",
    description: "Shared your bio with the community",
    emoji: "📜",
    category: "social",
  },
};

export class AchievementService {
  /**
   * Evaluate member progression metrics and return any newly unlocked badges.
   */
  evaluateBadges(
    currentBadgesJson: string,
    metrics: {
      messageCount: number;
      level: number;
      dailyStreak: number;
      reputation: number;
      voiceMinutes: number;
      hasBirthday: boolean;
      hasBio: boolean;
    },
  ): { newlyUnlocked: BadgeDefinition[]; updatedBadges: string[] } {
    let existingBadgeIds: string[] = [];
    try {
      existingBadgeIds = JSON.parse(currentBadgesJson || "[]");
    } catch {
      existingBadgeIds = [];
    }

    const newlyUnlocked: BadgeDefinition[] = [];

    const check = (id: string, condition: boolean) => {
      if (condition && !existingBadgeIds.includes(id)) {
        existingBadgeIds.push(id);
        const def = BADGE_REGISTRY[id];
        if (def) newlyUnlocked.push(def);
      }
    };

    check("first_words", metrics.messageCount >= 1);
    check("level_5", metrics.level >= 5);
    check("level_10", metrics.level >= 10);
    check("level_25", metrics.level >= 25);
    check("level_50", metrics.level >= 50);

    check("streak_3", metrics.dailyStreak >= 3);
    check("streak_7", metrics.dailyStreak >= 7);
    check("streak_30", metrics.dailyStreak >= 30);

    check("helpful_5", metrics.reputation >= 5);
    check("helpful_20", metrics.reputation >= 20);

    check("voice_30m", metrics.voiceMinutes >= 30);
    check("voice_3h", metrics.voiceMinutes >= 180);

    check("birthday_registered", metrics.hasBirthday);
    check("introducer", metrics.hasBio);

    return {
      newlyUnlocked,
      updatedBadges: existingBadgeIds,
    };
  }

  /**
   * Render badges as inline emoji chips.
   */
  formatBadgeDisplay(badgeIdsJson: string): string {
    try {
      const ids: string[] = JSON.parse(badgeIdsJson || "[]");
      if (ids.length === 0) return "`None yet`";
      return ids
        .map((id) => {
          const badge = BADGE_REGISTRY[id];
          return badge ? `${badge.emoji} **${badge.name}**` : null;
        })
        .filter(Boolean)
        .join(" • ");
    } catch {
      return "`None yet`";
    }
  }
}

export const achievementService = new AchievementService();
