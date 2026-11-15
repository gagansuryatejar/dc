/**
 * NEXUS AI — NexusClient
 * Discord.js v14 client wrapper with full intents, automatic reconnection,
 * graceful shutdown, and command/event dispatch.
 */

import {
  Client,
  GatewayIntentBits,
  Partials,
  Events,
  type ClientOptions,
} from "discord.js";
import { config } from "../config/index.js";
import { createModuleLogger } from "../utils/logger.js";
import { BOT_NAME, BOT_VERSION } from "../utils/constants.js";
import {
  connectDatabase,
  disconnectDatabase,
  databaseHealth,
  guildRepository,
} from "../database/index.js";
import { moduleLoader } from "../handlers/moduleLoader.js";
import { setGatewaySendPayload } from "../modules/voice/services/connectionManager.js";

const moduleLog = createModuleLogger("nexus-client");

export class NexusClient extends Client {
  private readonly startTime = Date.now();
  private shuttingDown = false;

  /** Persist all currently-cached guilds to PostgreSQL. */
  async persistCachedGuilds(): Promise<void> {
    for (const guild of this.guilds.cache.values()) {
      try {
        await guildRepository.findOrCreate({
          id: guild.id,
          name: guild.name,
          ownerId: guild.ownerId,
        });
      } catch (err) {
        moduleLog.error(
          { err, guildId: guild.id },
          "Failed to persist guild on startup",
        );
      }
    }
  }

  constructor(options?: ClientOptions) {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
      ],
      partials: [Partials.User, Partials.Channel, Partials.GuildMember, Partials.Message],
      ...options,
    });
  }

  /**
   * Starts the Discord client, connects to the database, loads modules,
   * and registers the global interaction handler.
   */
  async start(): Promise<void> {
    // Validate required configuration before connecting
    if (!config.discord.token) {
      throw new Error("DISCORD_TOKEN is not configured");
    }

    // Connect to PostgreSQL
    await connectDatabase();

    // Verify database health (non-fatal if unhealthy — bot can still run)
    const dbHealth = await databaseHealth();
    if (!dbHealth.healthy) {
      moduleLog.warn(
        { latencyMs: dbHealth.latencyMs },
        "Database health check failed — continuing with degraded persistence",
      );
    } else {
      moduleLog.info({ latencyMs: `${dbHealth.latencyMs}ms` }, "Database health check passed");
    }

    // Load all modules
    await moduleLoader.loadAll();
    moduleLog.info(`Loaded ${moduleLoader.size} module(s)`);

    // Register the global interaction handler (slash commands, buttons, selects, modals)
    this.on(Events.InteractionCreate, async (interaction) => {
      if (this.shuttingDown) return;
      await moduleLoader.handleInteraction(interaction);
    });

    // Core lifecycle events
    this.on(Events.ClientReady, async () => {
      this.handleReady();
      await this.persistCachedGuilds();

      // Set up voice adapter gateway sendPayload
      setGatewaySendPayload((payload: any) => {
        try {
          (this.ws as any).broadcast(payload);
          return true;
        } catch {
          return false;
        }
      });
      moduleLog.info("Voice gateway adapter configured");
    });
    this.on(Events.GuildCreate, (guild) => this.handleGuildCreate(guild));
    this.on(Events.GuildDelete, (guild) => this.handleGuildDelete(guild));
    this.on(Events.ShardReady, (id) =>
      moduleLog.info({ shard: id }, `Discord shard ${id} ready`),
    );
    this.on(Events.ShardReconnecting, (id) =>
      moduleLog.warn({ shard: id }, `Discord shard ${id} reconnecting`),
    );
    this.on(Events.ShardResume, (id) =>
      moduleLog.info({ shard: id }, `Discord shard ${id} resumed`),
    );

    // Error resilience
    this.on(Events.Error, (error) => {
      moduleLog.error({ error }, "Discord client error");
    });
    this.on(Events.Warn, (message) => {
      moduleLog.warn({ message }, "Discord client warning");
    });
    this.on(Events.Debug, (message) => {
      if (config.isDev) moduleLog.debug({ message }, "Discord debug");
    });

    // Connect to the Discord gateway
    moduleLog.info("Connecting to Discord gateway...");
    await this.login(config.discord.token);
  }

  private handleReady(): void {
    if (!this.user || !this.application) return;
    const uptime = Date.now() - this.startTime;
    moduleLog.info(
      {
        user: `${this.user.username}#${this.user.discriminator ?? "0"}`,
        id: this.user.id,
        guilds: this.guilds.cache.size,
        shards: this.shard?.count ?? 1,
        uptimeMs: uptime,
      },
      `${BOT_NAME} v${BOT_VERSION} is ready on Discord`,
    );
    moduleLog.info(
      `Logged in as ${this.user.tag} (${this.user.id}) | ${this.guilds.cache.size} guild(s)`,
    );
  }

  private handleGuildCreate(guild: import("discord.js").Guild): void {
    moduleLog.info({ guildId: guild.id, name: guild.name }, "Joined / added to a new guild");
    void guildRepository.findOrCreate({
      id: guild.id,
      name: guild.name,
      ownerId: guild.ownerId,
    }).catch((err) =>
      moduleLog.error({ err, guildId: guild.id }, "Failed to persist new guild"),
    );
  }

  private handleGuildDelete(guild: import("discord.js").Guild): void {
    moduleLog.info({ guildId: guild.id, name: guild.name }, "Removed from a guild");
  }

  /**
   * Graceful shutdown: unload modules, disconnect database, destroy Discord client.
   */
  async shutdown(): Promise<void> {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    moduleLog.info("Initiating controlled shutdown...");

    try {
      await moduleLoader.unloadAll();
      moduleLog.info("All modules unloaded");
    } catch (err) {
      moduleLog.error({ err }, "Error unloading modules during shutdown");
    }

    try {
      await disconnectDatabase();
    } catch (err) {
      moduleLog.error({ err }, "Error disconnecting database during shutdown");
    }

    try {
      this.destroy();
      moduleLog.info("Discord client destroyed");
    } catch (err) {
      moduleLog.error({ err }, "Error destroying Discord client");
    }

    moduleLog.info("Shutdown completed cleanly");
  }

  /** Get bot uptime in milliseconds. */
  get uptimeMs(): number {
    return Date.now() - this.startTime;
  }

  /** Whether the bot is currently shutting down. */
  get isShuttingDown(): boolean {
    return this.shuttingDown;
  }
}
