/**
 * NEXUS AI — Engagement Module
 * Member engagement engine: leveling, streaks, achievements, birthdays, suggestions, polls.
 */

import type { NexusModule, ModuleHealth } from "../../types/index.js";
import {
  profileData,
  leaderboardData,
  dailyData,
  streakData,
  repData,
  birthdayData,
  introData,
  suggestData,
  pollData,
  feedbackData,
  achievementsData,
} from "./commands/index.js";
import { createModuleLogger } from "../../utils/logger.js";

const log = createModuleLogger("engagement");

/** Convert command data to module command format. */
function toModuleCommand(data: any) {
  return {
    name: data.name,
    description: data.description,
    options: data.options,
  };
}

export const engagementModule: NexusModule = {
  name: "engagement",
  commands: [
    toModuleCommand(profileData),
    toModuleCommand(leaderboardData),
    toModuleCommand(dailyData),
    toModuleCommand(streakData),
    toModuleCommand(repData),
    toModuleCommand(birthdayData),
    toModuleCommand(introData),
    toModuleCommand(suggestData),
    toModuleCommand(pollData),
    toModuleCommand(feedbackData),
    toModuleCommand(achievementsData),
  ],
  events: ["messageCreate", "guildMemberAdd"],

  async onLoad(): Promise<void> {
    log.info("Engagement module loaded");
  },

  async onUnload(): Promise<void> {
    log.info("Engagement module unloaded");
  },

  async healthCheck(): Promise<ModuleHealth> {
    return { status: "healthy", module: "engagement" };
  },

  async handleInteraction(interaction: import("discord.js").BaseInteraction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    try {
      switch (commandName) {
        case "profile":
          await import("./commands/profile.js").then((m) => m.execute(interaction));
          break;
        case "leaderboard":
          await import("./commands/leaderboard.js").then((m) => m.execute(interaction));
          break;
        case "daily":
          await import("./commands/daily.js").then((m) => m.execute(interaction));
          break;
        case "streak":
          await import("./commands/streak.js").then((m) => m.execute(interaction));
          break;
        case "rep":
          await import("./commands/rep.js").then((m) => m.execute(interaction));
          break;
        case "birthday":
          await import("./commands/birthday.js").then((m) => m.execute(interaction));
          break;
        case "intro":
          await import("./commands/intro.js").then((m) => m.execute(interaction));
          break;
        case "suggest":
          await import("./commands/suggest.js").then((m) => m.execute(interaction));
          break;
        case "poll":
          await import("./commands/poll.js").then((m) => m.execute(interaction));
          break;
        case "feedback":
          await import("./commands/feedback.js").then((m) => m.execute(interaction));
          break;
        case "achievements":
          await import("./commands/achievements.js").then((m) => m.execute(interaction));
          break;
      }
    } catch (err) {
      log.error({ err, command: commandName }, "Command execution failed");
      throw err;
    }
  },
};