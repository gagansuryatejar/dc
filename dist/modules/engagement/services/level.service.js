/**
 * Leveling & XP calculation engine for NEXUS AI.
 * Uses a quadratic progression curve with anti-spam cooldown protection.
 */
export class LevelService {
    /** Anti-spam tracking: userId -> last Xp timestamp */
    xpCooldowns = new Map();
    /** Cooldown between awarding XP for messages: 60 seconds */
    COOLDOWN_MS = 60_000;
    /**
     * Calculates the XP needed to advance from `level` to `level + 1`.
     * Curve: 100, 155, 220, 295, 380...
     */
    xpForNextLevel(level) {
        return 5 * level * level + 50 * level + 100;
    }
    /**
     * Resolves the current level and progress from total accumulated XP.
     */
    calculateProgress(totalXp) {
        let level = 0;
        let xpRemaining = Math.max(0, totalXp);
        let needed = this.xpForNextLevel(level);
        while (xpRemaining >= needed) {
            xpRemaining -= needed;
            level++;
            needed = this.xpForNextLevel(level);
        }
        const progressPercent = Math.min(100, Math.floor((xpRemaining / needed) * 100));
        return {
            level,
            currentLevelXp: xpRemaining,
            xpNeededForNextLevel: needed,
            progressPercent,
            totalXp,
        };
    }
    /**
     * Checks if user is eligible for message XP based on anti-spam cooldown.
     */
    canEarnMessageXp(userId) {
        const now = Date.now();
        const last = this.xpCooldowns.get(userId);
        if (!last || now - last >= this.COOLDOWN_MS) {
            this.xpCooldowns.set(userId, now);
            return true;
        }
        return false;
    }
    /**
     * Returns a randomized XP amount between 15 and 25 for a message.
     */
    getRandomMessageXp() {
        return Math.floor(Math.random() * 11) + 15;
    }
    /**
     * Generates a sleek Unicode visual progress bar.
     * Example: [████████░░░░░░░░] 50%
     */
    renderProgressBar(percent, length = 12) {
        const safePercent = Math.max(0, Math.min(100, percent));
        const filledCount = Math.round((safePercent / 100) * length);
        const emptyCount = Math.max(0, length - filledCount);
        const filledBar = "█".repeat(filledCount);
        const emptyBar = "░".repeat(emptyCount);
        return `\`[${filledBar}${emptyBar}]\` **${safePercent}%**`;
    }
}
export const levelService = new LevelService();
//# sourceMappingURL=level.service.js.map