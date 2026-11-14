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
export declare const BADGE_REGISTRY: Record<string, BadgeDefinition>;
export declare class AchievementService {
    /**
     * Evaluate member progression metrics and return any newly unlocked badges.
     */
    evaluateBadges(currentBadgesJson: string, metrics: {
        messageCount: number;
        level: number;
        dailyStreak: number;
        reputation: number;
        voiceMinutes: number;
        hasBirthday: boolean;
        hasBio: boolean;
    }): {
        newlyUnlocked: BadgeDefinition[];
        updatedBadges: string[];
    };
    /**
     * Render badges as inline emoji chips.
     */
    formatBadgeDisplay(badgeIdsJson: string): string;
}
export declare const achievementService: AchievementService;
