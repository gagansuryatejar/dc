/**
 * Leveling & XP calculation engine for NEXUS AI.
 * Uses a quadratic progression curve with anti-spam cooldown protection.
 */
export interface LevelProgress {
    level: number;
    currentLevelXp: number;
    xpNeededForNextLevel: number;
    progressPercent: number;
    totalXp: number;
}
export declare class LevelService {
    /** Anti-spam tracking: userId -> last Xp timestamp */
    private readonly xpCooldowns;
    /** Cooldown between awarding XP for messages: 60 seconds */
    readonly COOLDOWN_MS = 60000;
    /**
     * Calculates the XP needed to advance from `level` to `level + 1`.
     * Curve: 100, 155, 220, 295, 380...
     */
    xpForNextLevel(level: number): number;
    /**
     * Resolves the current level and progress from total accumulated XP.
     */
    calculateProgress(totalXp: number): LevelProgress;
    /**
     * Checks if user is eligible for message XP based on anti-spam cooldown.
     */
    canEarnMessageXp(userId: string): boolean;
    /**
     * Returns a randomized XP amount between 15 and 25 for a message.
     */
    getRandomMessageXp(): number;
    /**
     * Generates a sleek Unicode visual progress bar.
     * Example: [████████░░░░░░░░] 50%
     */
    renderProgressBar(percent: number, length?: number): string;
}
export declare const levelService: LevelService;
