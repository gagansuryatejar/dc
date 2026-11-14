/**
 * Core bot client for NEXUS AI.
 * Includes resource monitoring, auto-recovery, and graceful shutdown
 * optimized for the HP All-in-One (Windows 10, 4GB RAM) and Android Termux.
 */
import { Client, GatewayIntentBits, Partials, } from "discord.js";
import os from "node:os";
import { config } from "../config/index.js";
import { connectDatabase, disconnectDatabase } from "../database/index.js";
import { moduleLoader } from "../handlers/moduleLoader.js";
import { commandHandler } from "../handlers/commandHandler.js";
import { interactionHandler } from "../handlers/interactionHandler.js";
import { createModuleLogger } from "../utils/logger.js";
import { formatBytes, formatDuration } from "../utils/helpers.js";
const logger = createModuleLogger("bot:client");
export class NexusClient extends Client {
    moduleLoader = moduleLoader;
    commandHandler = commandHandler;
    interactionHandler = interactionHandler;
    resourceMonitorTimer;
    isShuttingDown = false;
    constructor(options) {
        super({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildVoiceStates,
                GatewayIntentBits.GuildPresences,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.DirectMessages,
            ],
            partials: [
                Partials.User,
                Partials.Message,
                Partials.GuildMember,
                Partials.Channel,
                Partials.Reaction,
            ],
            // Close timeout for clean reconnection
            closeTimeout: 5000,
            ...options,
        });
        this.setupInternalListeners();
    }
    setupInternalListeners() {
        this.on("error", (error) => {
            logger.error({ error }, "Discord client encountered an unhandled gateway error");
        });
        this.on("warn", (message) => {
            logger.warn({ message }, "Discord client warning");
        });
        this.on("shardDisconnect", (event, shardId) => {
            logger.warn({ event, shardId }, `Shard ${shardId} disconnected. Automatic reconnection enabled.`);
        });
        this.on("shardReconnecting", (shardId) => {
            logger.info({ shardId }, `Shard ${shardId} reconnecting...`);
        });
        this.on("shardResume", (shardId, replayedEvents) => {
            logger.info({ shardId, replayedEvents }, `Shard ${shardId} resumed connection successfully.`);
        });
    }
    /**
     * Initializes database, loads modules, registers commands/events, and logs in.
     */
    async start() {
        try {
            logger.info("Starting NEXUS AI Core Engine...");
            logger.info(`Host Platform: ${os.platform()} (${os.release()}) | Total RAM: ${Math.round(os.totalmem() / 1024 / 1024)} MB`);
            // 1. Connect to SQLite database via Prisma
            await connectDatabase();
            // 2. Bind client to module loader and attach events
            this.moduleLoader.attachAllEvents(this);
            // 3. Start Background Resource Monitor (critical for 4GB HP Windows host)
            this.startResourceMonitor();
            // 4. Authenticate with Discord
            logger.info("Authenticating with Discord Gateway...");
            await this.login(config.discord.token);
            logger.info("Authentication handshake initiated.");
        }
        catch (error) {
            logger.fatal({ error }, "Fatal startup error encountered in NexusClient");
            throw error;
        }
    }
    /**
     * Periodic RAM and CPU watcher.
     * On a 4GB RAM system, keeps the bot's heap and RSS well within bounds.
     */
    startResourceMonitor() {
        // Monitor every 60 seconds
        this.resourceMonitorTimer = setInterval(() => {
            const memory = process.memoryUsage();
            const rssMb = Math.round(memory.rss / (1024 * 1024));
            const heapUsedMb = Math.round(memory.heapUsed / (1024 * 1024));
            // Warn if bot process exceeds 400MB on 4GB host
            if (rssMb > 400) {
                logger.warn({ rssMb, heapUsedMb }, `High memory consumption detected: ${rssMb} MB RSS. Forcing garbage collection if available.`);
                if (global.gc) {
                    try {
                        global.gc();
                        logger.info("Forced GC cycle completed.");
                    }
                    catch (e) {
                        logger.debug({ error: e }, "GC failed or not exposed");
                    }
                }
            }
        }, 60_000);
        if (this.resourceMonitorTimer.unref) {
            this.resourceMonitorTimer.unref();
        }
    }
    /**
     * Retrieve real-time performance and system resource metrics.
     */
    getResourceStats() {
        const mem = process.memoryUsage();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;
        let usersCount = 0;
        for (const guild of this.guilds.cache.values()) {
            usersCount += guild.memberCount || 0;
        }
        return {
            rss: formatBytes(mem.rss),
            heapUsed: formatBytes(mem.heapUsed),
            heapTotal: formatBytes(mem.heapTotal),
            external: formatBytes(mem.external),
            rawRssMb: Math.round(mem.rss / (1024 * 1024)),
            systemTotalRamMb: Math.round(totalMem / (1024 * 1024)),
            systemFreeRamMb: Math.round(freeMem / (1024 * 1024)),
            systemRamUsagePercent: Math.round((usedMem / totalMem) * 100),
            uptime: formatDuration(this.uptime ?? 0),
            uptimeSeconds: Math.floor((this.uptime ?? 0) / 1000),
            ping: Math.round(this.ws.ping),
            guildsCount: this.guilds.cache.size,
            usersCount,
            modulesLoaded: this.moduleLoader.size,
        };
    }
    /**
     * Graceful shutdown of bot, active modules, and database connection.
     */
    async shutdown() {
        if (this.isShuttingDown)
            return;
        this.isShuttingDown = true;
        logger.info("Initiating graceful shutdown sequence...");
        // Stop background resource monitor
        if (this.resourceMonitorTimer) {
            clearInterval(this.resourceMonitorTimer);
            this.resourceMonitorTimer = undefined;
        }
        // Unload all active modules
        const modules = this.moduleLoader.getAll();
        for (const mod of modules) {
            try {
                await mod.onUnload();
                logger.info(`Unloaded module: ${mod.name}`);
            }
            catch (err) {
                logger.error({ err, module: mod.name }, "Error unloading module during shutdown");
            }
        }
        // Disconnect database
        try {
            await disconnectDatabase();
            logger.info("Database disconnected successfully.");
        }
        catch (err) {
            logger.error({ err }, "Error disconnecting database during shutdown");
        }
        // Destroy Discord client connection
        this.destroy();
        logger.info("NEXUS AI client shutdown complete.");
    }
}
//# sourceMappingURL=client.js.map