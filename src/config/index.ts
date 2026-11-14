import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

// Load .env file before anything else
dotenvConfig();

/**
 * Deployment modes supported by NEXUS AI.
 * - `android`  — running on Termux / Android; native deps (voice) are disabled.
 * - `server`   — full-featured server deployment.
 */
export const DeploymentMode = {
  ANDROID: "android",
  SERVER: "server",
} as const;

export type DeploymentMode = (typeof DeploymentMode)[keyof typeof DeploymentMode];

// ── Zod schema for every env var ────────────────────────

const envSchema = z.object({
  // Discord — required
  DISCORD_TOKEN: z
    .string({ required_error: "DISCORD_TOKEN is required. Set it in your .env file." })
    .min(1, "DISCORD_TOKEN must not be empty."),
  DISCORD_CLIENT_ID: z
    .string({ required_error: "DISCORD_CLIENT_ID is required. Set it in your .env file." })
    .min(1, "DISCORD_CLIENT_ID must not be empty."),
  DISCORD_CLIENT_SECRET: z.string().default(""),
  DISCORD_PUBLIC_KEY: z.string().default(""),
  OWNER_ID: z.string().default(""),
  GUILD_ID: z.string().default(""),

  // Database
  DATABASE_URL: z.string().default("file:./data/nexus.db"),

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // AI
  AI_PROVIDER: z.enum(["gemini", "openai", "ollama"]).default("gemini"),
  GEMINI_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),

  // Dashboard
  DASHBOARD_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_SECRET: z.string().default(""),

  // Deployment
  DEPLOYMENT_MODE: z
    .enum(["android", "server"])
    .default("server"),
  ANDROID_VOICE_MODE: z
    .enum(["lightweight", "advanced"])
    .default("lightweight"),
  ANDROID_BATTERY_GUARD: z
    .coerce.boolean()
    .default(true),
});

// ── Parse & validate ────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  ✖ ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  // Use console.error directly — the logger may not be initialised yet
  // eslint-disable-next-line no-console
  console.error(
    `\n❌  Environment validation failed:\n${formatted}\n\nSee .env.example for reference.\n`,
  );
  process.exit(1);
}

const env = parsed.data;

// ── Exported config object ──────────────────────────────

export const config = {
  // Discord
  discord: {
    token: env.DISCORD_TOKEN,
    clientId: env.DISCORD_CLIENT_ID,
    clientSecret: env.DISCORD_CLIENT_SECRET,
    publicKey: env.DISCORD_PUBLIC_KEY,
    ownerId: env.OWNER_ID,
    guildId: env.GUILD_ID,
  },

  // Database
  database: {
    url: env.DATABASE_URL,
  },

  // Logging
  logLevel: env.LOG_LEVEL,

  // Environment
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  // AI
  ai: {
    provider: env.AI_PROVIDER,
    geminiApiKey: env.GEMINI_API_KEY,
    openaiApiKey: env.OPENAI_API_KEY,
    ollamaUrl: env.OLLAMA_URL,
  },

  // Dashboard
  dashboard: {
    port: env.DASHBOARD_PORT,
    secret: env.DASHBOARD_SECRET,
  },

  // Deployment
  deploymentMode: env.DEPLOYMENT_MODE as DeploymentMode,
  android: {
    voiceMode: env.ANDROID_VOICE_MODE,
    batteryGuard: env.ANDROID_BATTERY_GUARD,
  },
} as const;

// ── Helpers ─────────────────────────────────────────────

/** `true` when running in Android / Termux mode. */
export const isAndroid: boolean = config.deploymentMode === DeploymentMode.ANDROID;

/** `true` when running in Android Lightweight Mode (voice audio receive bypassed). */
export const isAndroidLightweight: boolean =
  isAndroid && config.android.voiceMode === "lightweight";
