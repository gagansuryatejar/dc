/**
 * Voice module definition for NEXUS AI.
 * Voice activity management, milestones, dynamic temporary rooms, and voice assistant.
 */
import { type Client } from "discord.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class VoiceModule implements NexusModule {
    readonly name: "voice";
    readonly description = "Voice activity tracking, sweet AI companion presence, dynamic temporary rooms, and audio advisor";
    readonly version = "1.1.0";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: import("../../types/index.js").NexusEvent<import("discord.js").Events.VoiceStateUpdate>[];
    onLoad(client?: Client): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const voiceModule: VoiceModule;
export default voiceModule;
