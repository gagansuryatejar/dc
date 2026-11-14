/**
 * Core bot client for NEXUS AI.
 * Includes resource monitoring, auto-recovery, and graceful shutdown
 * optimized for the HP All-in-One (Windows 10, 4GB RAM) and Android Termux.
 */
import { Client, type ClientOptions } from "discord.js";
import { ModuleLoader } from "../handlers/moduleLoader.js";
import { CommandHandler } from "../handlers/commandHandler.js";
import { InteractionHandler } from "../handlers/interactionHandler.js";
export interface ResourceStats {
    rss: string;
    heapUsed: string;
    heapTotal: string;
    external: string;
    rawRssMb: number;
    systemTotalRamMb: number;
    systemFreeRamMb: number;
    systemRamUsagePercent: number;
    uptime: string;
    uptimeSeconds: number;
    ping: number;
    guildsCount: number;
    usersCount: number;
    modulesLoaded: number;
}
export declare class NexusClient extends Client {
    readonly moduleLoader: ModuleLoader;
    readonly commandHandler: CommandHandler;
    readonly interactionHandler: InteractionHandler;
    private resourceMonitorTimer?;
    private isShuttingDown;
    constructor(options?: Partial<ClientOptions>);
    private setupInternalListeners;
    /**
     * Initializes database, loads modules, registers commands/events, and logs in.
     */
    start(): Promise<void>;
    /**
     * Periodic RAM and CPU watcher.
     * On a 4GB RAM system, keeps the bot's heap and RSS well within bounds.
     */
    private startResourceMonitor;
    /**
     * Retrieve real-time performance and system resource metrics.
     */
    getResourceStats(): ResourceStats;
    /**
     * Graceful shutdown of bot, active modules, and database connection.
     */
    shutdown(): Promise<void>;
}
