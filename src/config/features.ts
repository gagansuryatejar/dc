/**
 * Feature-flag definitions for every NEXUS AI module.
 *
 * Each flag carries a human-readable label and a default enabled / disabled
 * state.  The module loader reads these at startup to decide which modules
 * to initialise.  Flags can be overridden at runtime via the dashboard or
 * a database-backed settings table.
 */

// ── Module name constants ───────────────────────────────

/** User engagement: levels, XP, leaderboards, welcome messages. */
export const ENGAGEMENT = "engagement" as const;

/** Voice-channel utilities: join / leave, temp channels. */
export const VOICE = "voice" as const;

/** Voice intelligence: speech-to-text, transcription, summaries. */
export const VOICE_INTELLIGENCE = "voice-intelligence" as const;

/** Streamer integrations: go-live alerts, Twitch / YouTube hooks. */
export const STREAMER = "streamer" as const;

/** AI chat, summarisation, image generation, prompt tools. */
export const AI = "ai" as const;

/** Moderation: auto-mod, warns, mutes, bans, audit log. */
export const MODERATION = "moderation" as const;

/** Virtual economy: currency, shop, inventory, trading. */
export const ECONOMY = "economy" as const;

/** Achievement / badge system tied to user activity. */
export const ACHIEVEMENTS = "achievements" as const;

/** Server analytics: message stats, activity graphs, reports. */
export const ANALYTICS = "analytics" as const;

/** Scheduled events, RSVPs, reminders. */
export const EVENTS = "events" as const;

/** Workflow automation: custom triggers, actions, cron jobs. */
export const AUTOMATION = "automation" as const;

/** Support ticket system: create, assign, close, transcripts. */
export const TICKETS = "tickets" as const;

// ── Feature flag type ───────────────────────────────────

export interface FeatureFlag {
  /** Internal module identifier (matches the constants above). */
  readonly name: string;
  /** Short human-readable label shown in the dashboard. */
  readonly label: string;
  /** Whether the module is loaded by default on a fresh install. */
  readonly enabledByDefault: boolean;
  /** Brief description of what the module provides. */
  readonly description: string;
}

// ── Default feature flags ───────────────────────────────

export const DEFAULT_FEATURES: ReadonlyArray<FeatureFlag> = [
  {
    name: ENGAGEMENT,
    label: "Engagement",
    enabledByDefault: true,
    description: "XP, levels, leaderboards, and welcome messages.",
  },
  {
    name: VOICE,
    label: "Voice",
    enabledByDefault: true,
    description: "Voice-channel utilities and temporary channels.",
  },
  {
    name: VOICE_INTELLIGENCE,
    label: "Voice Intelligence",
    enabledByDefault: false,
    description: "Speech-to-text transcription and voice summaries.",
  },
  {
    name: STREAMER,
    label: "Streamer",
    enabledByDefault: false,
    description: "Go-live alerts and Twitch / YouTube integrations.",
  },
  {
    name: AI,
    label: "AI",
    enabledByDefault: true,
    description: "AI-powered chat, summarisation, and image generation.",
  },
  {
    name: MODERATION,
    label: "Moderation",
    enabledByDefault: true,
    description: "Auto-mod rules, warns, mutes, bans, and audit logging.",
  },
  {
    name: ECONOMY,
    label: "Economy",
    enabledByDefault: false,
    description: "Virtual currency, shop, inventory, and trading.",
  },
  {
    name: ACHIEVEMENTS,
    label: "Achievements",
    enabledByDefault: false,
    description: "Badge and achievement system tied to user activity.",
  },
  {
    name: ANALYTICS,
    label: "Analytics",
    enabledByDefault: false,
    description: "Server activity statistics, graphs, and reports.",
  },
  {
    name: EVENTS,
    label: "Events",
    enabledByDefault: false,
    description: "Scheduled events, RSVPs, and reminders.",
  },
  {
    name: AUTOMATION,
    label: "Automation",
    enabledByDefault: false,
    description: "Custom triggers, actions, and cron-based workflows.",
  },
  {
    name: TICKETS,
    label: "Tickets",
    enabledByDefault: false,
    description: "Support ticket creation, assignment, and transcripts.",
  },
] as const;

// ── Lookup helpers ──────────────────────────────────────

/** Core module — always loaded, cannot be disabled. */
export const CORE = "core" as const;

/** All module names as a union type. */
export type ModuleName =
  | typeof CORE
  | typeof ENGAGEMENT
  | typeof VOICE
  | typeof VOICE_INTELLIGENCE
  | typeof STREAMER
  | typeof AI
  | typeof MODERATION
  | typeof ECONOMY
  | typeof ACHIEVEMENTS
  | typeof ANALYTICS
  | typeof EVENTS
  | typeof AUTOMATION
  | typeof TICKETS;

/** All module name strings collected in an array for iteration. */
export const ALL_MODULE_NAMES: ReadonlyArray<ModuleName> = [
  CORE,
  ENGAGEMENT,
  VOICE,
  VOICE_INTELLIGENCE,
  STREAMER,
  AI,
  MODERATION,
  ECONOMY,
  ACHIEVEMENTS,
  ANALYTICS,
  EVENTS,
  AUTOMATION,
  TICKETS,
] as const;

/**
 * Look up a feature flag by module name.
 * Returns `undefined` if the name is unknown.
 */
export function getFeatureFlag(name: string): FeatureFlag | undefined {
  return DEFAULT_FEATURES.find((f) => f.name === name);
}

/**
 * Returns `true` when the given module is enabled by default.
 * Unknown module names are treated as disabled.
 */
export function isEnabledByDefault(name: string): boolean {
  return getFeatureFlag(name)?.enabledByDefault ?? false;
}
