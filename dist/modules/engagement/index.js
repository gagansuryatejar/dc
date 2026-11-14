/**
 * Engagement module definition for NEXUS AI.
 * Advanced member onboarding, activity tracking, leveling, celebrations, and community tools.
 */
import { ENGAGEMENT } from "../../config/features.js";
import { createModuleLogger } from "../../utils/logger.js";
// Commands
import { profileCommand } from "./commands/profile.js";
import { leaderboardCommand } from "./commands/leaderboard.js";
import { dailyCommand } from "./commands/daily.js";
import { streakCommand } from "./commands/streak.js";
import { repCommand } from "./commands/rep.js";
import { birthdayCommand } from "./commands/birthday.js";
import { introCommand } from "./commands/intro.js";
import { suggestCommand } from "./commands/suggest.js";
import { pollCommand } from "./commands/poll.js";
import { feedbackCommand } from "./commands/feedback.js";
import { achievementsCommand } from "./commands/achievements.js";
// Events
import { guildMemberAddEvent } from "./events/guild-member-add.js";
import { messageCreateEvent } from "./events/message-create.js";
// Services & Interactions
import { birthdayService } from "./services/birthday.service.js";
import { registerWelcomeInteractions } from "./interactions/welcome-buttons.js";
import { registerSuggestionInteractions } from "./interactions/suggestion-buttons.js";
import { registerPollInteractions } from "./interactions/poll-buttons.js";
const logger = createModuleLogger("module:engagement");
export class EngagementModule {
    name = ENGAGEMENT;
    description = "Member progression, leveling, onboarding, celebrations, suggestions, and streaks";
    version = "1.0.0";
    commands = [
        profileCommand,
        leaderboardCommand,
        dailyCommand,
        streakCommand,
        repCommand,
        birthdayCommand,
        introCommand,
        suggestCommand,
        pollCommand,
        feedbackCommand,
        achievementsCommand,
    ];
    events = [guildMemberAddEvent, messageCreateEvent];
    async onLoad(client) {
        logger.info("Initializing Engagement Subsystem...");
        // Register button & component interaction handlers
        registerWelcomeInteractions();
        registerSuggestionInteractions();
        registerPollInteractions();
        // Start birthday scanner if client is provided
        if (client) {
            birthdayService.startScheduler(client);
        }
    }
    async onUnload() {
        birthdayService.stopScheduler();
        logger.info("Engagement Subsystem unloaded.");
    }
    async onEnable() {
        logger.info("Engagement Subsystem enabled.");
    }
    async onDisable() {
        logger.info("Engagement Subsystem disabled.");
    }
    async healthCheck() {
        return {
            status: "healthy",
            message: "Engagement engine and progression trackers operational.",
            lastCheck: new Date(),
        };
    }
}
export const engagementModule = new EngagementModule();
export default engagementModule;
//# sourceMappingURL=index.js.map