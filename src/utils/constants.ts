/**
 * Global constants for NEXUS AI.
 */

/** Display name of the bot. */
export const BOT_NAME = "NEXUS AI";

/** Current version of the bot. */
export const BOT_VERSION = "1.0.0";

/** Bot description. */
export const BOT_DESCRIPTION =
  "An advanced, modular Discord bot with AI capabilities, engagement systems, and comprehensive server management.";

/** Default embed footer text. */
export const FOOTER_TEXT = `${BOT_NAME} v${BOT_VERSION}`;

/** Bot thumbnail / avatar URL (fallback). */
export const BOT_AVATAR_FALLBACK =
  "https://cdn.discordapp.com/embed/avatars/0.png";

/** Common emojis used across embeds and messages. */
export const EMOJIS = {
  // Status
  SUCCESS: "✅",
  ERROR: "❌",
  WARNING: "⚠️",
  INFO: "ℹ️",
  LOADING: "⏳",

  // Modules
  ENABLED: "🟢",
  DISABLED: "🔴",
  HEALTHY: "💚",
  DEGRADED: "💛",
  UNHEALTHY: "❤️",

  // UI
  STAR: "⭐",
  SPARKLE: "✨",
  HEART: "💜",
  BOLT: "⚡",
  GEAR: "⚙️",
  SHIELD: "🛡️",
  CHART: "📊",
  CLOCK: "🕐",
  GLOBE: "🌐",
  PING: "🏓",
  SERVER: "🖥️",
  DATABASE: "🗄️",
  MEMORY: "💾",
  CROWN: "👑",
  WAVE: "👋",
  ROCKET: "🚀",
  BOOK: "📖",
  LINK: "🔗",
  HASH: "#️⃣",
  MEGAPHONE: "📢",
  WRENCH: "🔧",
  LOCK: "🔒",
  UNLOCK: "🔓",
  ARROW_RIGHT: "▶️",
  ARROW_LEFT: "◀️",
  DOT: "•",
  DASH: "—",
  DIVIDER: "━━━━━━━━━━━━━━━━━━━━",
} as const;

/** Maximum items per embed field (Discord limit). */
export const MAX_EMBED_FIELDS = 25;

/** Maximum options for a select menu. */
export const MAX_SELECT_OPTIONS = 25;

/** Default pagination page size. */
export const DEFAULT_PAGE_SIZE = 10;
