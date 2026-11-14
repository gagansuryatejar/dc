/**
 * Streamer & Content Creator Module definition for NEXUS AI.
 */
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class StreamerModule implements NexusModule {
    readonly name: "streamer";
    readonly version = "1.0.0";
    readonly description = "Content creator profiles, Discord Go Live tracking, streamer protection, watch parties, and creator lounges";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: (import("../../types/index.js").NexusEvent<"interactionCreate"> | import("../../types/index.js").NexusEvent<"presenceUpdate">)[];
    onLoad(): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const streamerModule: StreamerModule;
