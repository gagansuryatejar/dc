/**
 * Voice Assistant & Audio Optimization Advisor for NEXUS AI.
 * Handles voice channel connections, audio playback subscriptions,
 * consent-based voice intelligence tracking, and client-side audio optimization advice.
 */
import type { VoiceBasedChannel } from "discord.js";
import { type VoiceConnection } from "@discordjs/voice";
export interface AudioAdvice {
    bitrateKbps: number;
    recommendation: string;
    krispAdvice: string;
    gainAdvice: string;
    clippingAdvice: string;
    regionAdvice: string;
}
export declare class VoiceAssistantService {
    private readonly players;
    /**
     * Indicates whether native UDP audio receive is bypassed (Android Lightweight Mode).
     */
    isAudioBypassed(): boolean;
    /**
     * Connect to an authorized voice channel.
     */
    join(channel: VoiceBasedChannel): Promise<VoiceConnection>;
    /**
     * Disconnect and clean up voice resources for a guild.
     */
    leave(guildId: string): boolean;
    /**
     * Check if bot is connected to voice in a guild.
     */
    isConnected(guildId: string): boolean;
    /**
     * Play an audio resource through the guild's active audio player.
     */
    playAudio(guildId: string, resource: any): boolean;
    /**
     * Generates actionable audio optimization advice for a voice channel.
     */
    getAudioOptimizationAdvice(channel: VoiceBasedChannel): AudioAdvice;
    /**
     * Evaluate member explicit consent for voice intelligence.
     */
    hasConsent(guildId: string, userId: string): Promise<boolean>;
    /**
     * Update member explicit opt-in / opt-out consent.
     */
    setConsent(guildId: string, userId: string, optIn: boolean): Promise<void>;
}
export declare const voiceAssistantService: VoiceAssistantService;
