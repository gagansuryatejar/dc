/**
 * Core module definition for NEXUS AI.
 * Always loaded, foundational subsystem for all bot operations.
 */
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class CoreModule implements NexusModule {
    readonly name: "core";
    readonly description = "Core bot lifecycle, diagnostics, permissions, and server administration";
    readonly version = "1.0.0";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: (import("../../types/index.js").NexusEvent<import("discord.js").Events.ClientReady> | import("../../types/index.js").NexusEvent<import("discord.js").Events.GuildCreate> | import("../../types/index.js").NexusEvent<import("discord.js").Events.GuildDelete> | import("../../types/index.js").NexusEvent<import("discord.js").Events.InteractionCreate>)[];
    onLoad(): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const coreModule: CoreModule;
export default coreModule;
