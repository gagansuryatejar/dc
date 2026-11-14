/**
 * Feature-flag definitions for every NEXUS AI module.
 *
 * Each flag carries a human-readable label and a default enabled / disabled
 * state.  The module loader reads these at startup to decide which modules
 * to initialise.  Flags can be overridden at runtime via the dashboard or
 * a database-backed settings table.
 */
/** User engagement: levels, XP, leaderboards, welcome messages. */
export declare const ENGAGEMENT: "engagement";
/** Voice-channel utilities: join / leave, temp channels. */
export declare const VOICE: "voice";
/** Voice intelligence: speech-to-text, transcription, summaries. */
export declare const VOICE_INTELLIGENCE: "voice-intelligence";
/** Streamer integrations: go-live alerts, Twitch / YouTube hooks. */
export declare const STREAMER: "streamer";
/** AI chat, summarisation, image generation, prompt tools. */
export declare const AI: "ai";
/** Moderation: auto-mod, warns, mutes, bans, audit log. */
export declare const MODERATION: "moderation";
/** Virtual economy: currency, shop, inventory, trading. */
export declare const ECONOMY: "economy";
/** Achievement / badge system tied to user activity. */
export declare const ACHIEVEMENTS: "achievements";
/** Server analytics: message stats, activity graphs, reports. */
export declare const ANALYTICS: "analytics";
/** Scheduled events, RSVPs, reminders. */
export declare const EVENTS: "events";
/** Workflow automation: custom triggers, actions, cron jobs. */
export declare const AUTOMATION: "automation";
/** Support ticket system: create, assign, close, transcripts. */
export declare const TICKETS: "tickets";
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
export declare const DEFAULT_FEATURES: ReadonlyArray<FeatureFlag>;
/** Core module — always loaded, cannot be disabled. */
export declare const CORE: "core";
/** All module names as a union type. */
export type ModuleName = typeof CORE | typeof ENGAGEMENT | typeof VOICE | typeof VOICE_INTELLIGENCE | typeof STREAMER | typeof AI | typeof MODERATION | typeof ECONOMY | typeof ACHIEVEMENTS | typeof ANALYTICS | typeof EVENTS | typeof AUTOMATION | typeof TICKETS;
/** All module name strings collected in an array for iteration. */
export declare const ALL_MODULE_NAMES: ReadonlyArray<ModuleName>;
/**
 * Look up a feature flag by module name.
 * Returns `undefined` if the name is unknown.
 */
export declare function getFeatureFlag(name: string): FeatureFlag | undefined;
/**
 * Returns `true` when the given module is enabled by default.
 * Unknown module names are treated as disabled.
 */
export declare function isEnabledByDefault(name: string): boolean;
