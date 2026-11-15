/**
 * NEXUS AI — Shared TypeScript types
 */

/** A minimal representation of a Discord guild used internally. */
export interface NexusGuild {
  id: string;
  name: string;
  ownerId: string;
  joinedAt: Date;
}

/** A minimal representation of a Discord user used internally. */
export interface NexusUser {
  id: string;
  username: string;
  displayName?: string;
  bot: boolean;
}

/** Reward outcome for engagement/milestone systems. */

/** Slash command context passed to command handlers. */
export interface CommandContext {
  guildId: string | null;
  channelId: string;
  userId: string;
  memberId: string | null;
}

/** Health check result for modules. */
export interface ModuleHealth {
  status: "healthy" | "degraded" | "unhealthy";
  module: string;
  details?: Record<string, unknown>;
}

/** Shape of a NEXUS module. */
export interface NexusModule {
  name: ModuleName;
  /** Array of slash-command definitions (for registration). */
  commands: Array<{
    name: string;
    description: string;
    options?: unknown[];
  }>;
  /** Array of event names this module listens to. */
  events: readonly string[];
  /** Optional handler for Discord interactions. */
  handleInteraction?: (
    interaction: import("discord.js").BaseInteraction,
  ) => Promise<void> | void;
  /** Optional health check. */
  healthCheck?: () => Promise<ModuleHealth>;
  /** Optional setup called on load. */
  onLoad?: () => Promise<void> | void;
  /** Optional teardown called on unload. */
  onUnload?: () => Promise<void> | void;
}

/** Reward outcome for engagement/milestone systems. */
export interface RewardOutcome {
  xp: number;
  coins: number;
  badge?: string;
  milestone?: string;
  duplicated: boolean;
}

/** AI provider choice. */
export type AIProvider = "gemini" | "openai" | "ollama";

/** Module lifecycle name. */
export type ModuleName =
  | "core"
  | "engagement"
  | "voice"
  | "heart"
  | "ai"
  | "moderation"
  | "streamer"
  | "analytics"
  | "economy"
  | "automation"
  | "notifications";
