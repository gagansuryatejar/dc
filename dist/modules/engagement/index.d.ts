/**
 * Engagement module definition for NEXUS AI.
 * Advanced member onboarding, activity tracking, leveling, celebrations, and community tools.
 */
import { type Client } from "discord.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class EngagementModule implements NexusModule {
    readonly name: "engagement";
    readonly description = "Member progression, leveling, onboarding, celebrations, suggestions, and streaks";
    readonly version = "1.0.0";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: (import("../../types/index.js").NexusEvent<import("discord.js").Events.GuildMemberAdd> | import("../../types/index.js").NexusEvent<import("discord.js").Events.MessageCreate>)[];
    onLoad(client?: Client): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const engagementModule: EngagementModule;
export default engagementModule;
