/**
 * Moderation & Interactive Support Module for NEXUS AI.
 * Exports module definition, slash commands, and event handlers.
 */
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class ModerationModule implements NexusModule {
    readonly name: "moderation";
    readonly version = "1.0.0";
    readonly description = "Automated threat detection, anti-spam, anti-raid, infraction management, and support tickets";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: (import("../../types/index.js").NexusEvent<"messageCreate"> | import("../../types/index.js").NexusEvent<"guildMemberAdd"> | import("../../types/index.js").NexusEvent<"interactionCreate">)[];
    onLoad(): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const moderationModule: ModerationModule;
