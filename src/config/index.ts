/**
 * NEXUS AI — Centralized Configuration Engine
 * Zod-validated environment variables with fail-safe defaults and clear diagnostics.
 * PostgreSQL is the production database (see DATABASE_URL).
 */

import { config as dotenvConfig } from "dotenv";
import { z } from "zod";

// Load .env before anything else
dotenvConfig();

/**
 * Deployment modes supported by NEXUS AI.
 * `server` = full-featured Linux VPS / cloud deployment.
 */
export const DeploymentMode = {
  SERVER: "server",
} as const;

export type DeploymentMode = (typeof DeploymentMode)[keyof typeof DeploymentMode];

// ── Zod schema for every env var ──────────────────────────────────────

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

  // Database — PostgreSQL (production) or SQLite (local/development).
  // Both are first-class: Prisma drives the actual connector from the URL prefix.
  DATABASE_URL: z
    .string({ required_error: "DATABASE_URL is required. Set it in your .env file." })
    .min(1, "DATABASE_URL must not be empty.")
    .refine(
      (url) =>
        url.startsWith("postgresql://") ||
        url.startsWith("postgres://") ||
        url.startsWith("file:"),
      "DATABASE_URL must be a PostgreSQL (postgresql://) or SQLite (file:) connection string.",
    ),

  // Redis — cache & queue (required in production)
  REDIS_URL: z.string().default(""),

  // Logging
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),

  // Environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Backend API
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  API_HOST: z.string().default("0.0.0.0"),

  // AI
  AI_PROVIDER: z.enum(["gemini", "openai", "ollama"]).default("gemini"),
  GEMINI_API_KEY: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  OLLAMA_URL: z.string().url().default("http://localhost:11434"),

  // Dashboard (Phase 11)
  DASHBOARD_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  DASHBOARD_SECRET: z.string().default(""),

  // Security
  JWT_SECRET: z.string().default(""),
  ENCRYPTION_KEY: z.string().default(""),

  // Deployment
  DEPLOYMENT_MODE: z.enum(["server"]).default("server"),
});

// ── Parse & validate ──────────────────────────────────────────────────

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.issues
    .map((issue) => `  ✖ ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  // console.error directly — the logger may not be initialised yet
  // eslint-disable-next-line no-console
  console.error(
    `\n❌  Environment validation failed:\n${formatted}\n\nSee .env.example for reference.\n`,
  );
  process.exit(1);
}

const env = parsed.data;

// ── Exported config object ────────────────────────────────────────────

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

  // Database (PostgreSQL)
  database: {
    url: env.DATABASE_URL,
  },

  // Redis
  redis: {
    url: env.REDIS_URL,
  },

  // Logging
  logLevel: env.LOG_LEVEL,

  // Environment
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
  isTest: env.NODE_ENV === "test",

  // Backend API
  api: {
    port: env.API_PORT,
    host: env.API_HOST,
  },

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

  // Security
  security: {
    jwtSecret: env.JWT_SECRET,
    encryptionKey: env.ENCRYPTION_KEY,
  },

  // Deployment
  deploymentMode: env.DEPLOYMENT_MODE as DeploymentMode,
} as const;

// ── Helpers ───────────────────────────────────────────────────────────

/** `true` when running in production. */
export const isProduction: boolean = config.isProd;

/** `true` when running in test mode. */
export const isTest: boolean = config.isTest;
