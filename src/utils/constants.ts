/**
 * NEXUS AI — Application constants
 */

export const BOT_NAME = "NEXUS AI";
export const BOT_VERSION = "1.0.0";
export const BOT_TAGLINE = "Your Community. Your AI. Your Connection.";

/** Default footer text appended to all branded embeds. */
export const FOOTER_TEXT = "NEXUS AI • Your Community. Your AI. Your Connection.";

/** Discord gateway intents required by NEXUS AI. */
export const DISCORD_INTENTS = [
  "Guilds",
  "GuildMembers",
  "GuildMessages",
  "MessageContent",
  "GuildVoiceStates",
  "GuildPresences",
] as const;

/** Default partials for the Discord client. */
export const DISCORD_PARTIALS = ["User", "Channel", "GuildMember", "Message"] as const;

/** Cooldown (ms) between automatic XP grants per user (anti-spam). */
export const XP_COOLDOWN_MS = 60_000;

/** Random XP range per qualifying message. */
export const XP_MIN = 15;
export const XP_MAX = 25;

/** Voice XP per minute of active participation. */
export const VOICE_XP_PER_MINUTE = 1;

/** Default voice milestone thresholds (minutes). */
export const VOICE_MILESTONES = [15, 30, 60, 120, 180, 300] as const;

/** Daily reward cooldown (24 hours). */
export const DAILY_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Reputation cooldown (24 hours). */
export const REP_COOLDOWN_MS = 24 * 60 * 60 * 1000;

/** Idle timeout in milliseconds (default 30 seconds). */
export const IDLE_TIMEOUT_MS = 30_000;
