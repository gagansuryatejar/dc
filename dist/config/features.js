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
export const ENGAGEMENT = "engagement";
/** Voice-channel utilities: join / leave, temp channels. */
export const VOICE = "voice";
/** Voice intelligence: speech-to-text, transcription, summaries. */
export const VOICE_INTELLIGENCE = "voice-intelligence";
/** Streamer integrations: go-live alerts, Twitch / YouTube hooks. */
export const STREAMER = "streamer";
/** AI chat, summarisation, image generation, prompt tools. */
export const AI = "ai";
/** Moderation: auto-mod, warns, mutes, bans, audit log. */
export const MODERATION = "moderation";
/** Virtual economy: currency, shop, inventory, trading. */
export const ECONOMY = "economy";
/** Achievement / badge system tied to user activity. */
export const ACHIEVEMENTS = "achievements";
/** Server analytics: message stats, activity graphs, reports. */
export const ANALYTICS = "analytics";
/** Scheduled events, RSVPs, reminders. */
export const EVENTS = "events";
/** Workflow automation: custom triggers, actions, cron jobs. */
export const AUTOMATION = "automation";
/** Support ticket system: create, assign, close, transcripts. */
export const TICKETS = "tickets";
// ── Default feature flags ───────────────────────────────
export const DEFAULT_FEATURES = [
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
];
// ── Lookup helpers ──────────────────────────────────────
/** Core module — always loaded, cannot be disabled. */
export const CORE = "core";
/** All module name strings collected in an array for iteration. */
export const ALL_MODULE_NAMES = [
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
];
/**
 * Look up a feature flag by module name.
 * Returns `undefined` if the name is unknown.
 */
export function getFeatureFlag(name) {
    return DEFAULT_FEATURES.find((f) => f.name === name);
}
/**
 * Returns `true` when the given module is enabled by default.
 * Unknown module names are treated as disabled.
 */
export function isEnabledByDefault(name) {
    return getFeatureFlag(name)?.enabledByDefault ?? false;
}
//# sourceMappingURL=features.js.map