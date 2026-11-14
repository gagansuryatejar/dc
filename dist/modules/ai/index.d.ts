/**
 * AI module definition for NEXUS AI.
 * Natural language chat, multilingual support (Telugu & English), channel summarization,
 * draft announcements, and approved server knowledge FAQs.
 */
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class AIModule implements NexusModule {
    readonly name: "ai";
    readonly description = "Advanced AI brain, multilingual chat (Telugu & English), community pulse, voice companion, server lore, and interactive games";
    readonly version = "1.0.0";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: (import("../../types/index.js").NexusEvent<import("discord.js").Events.InteractionCreate> | import("../../types/index.js").NexusEvent<import("discord.js").Events.MessageCreate>)[];
    onLoad(): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const aiModule: AIModule;
export default aiModule;
