/**
 * Heart Personality & Sweet Appreciation Engine for NEXUS AI.
 * Generates natural, affectionate, and cheerful voice greetings and milestone celebrations.
 * Supports 5 distinct personalities and multilingual communications (English, Telugu, Tenglish).
 */
import { type AudioResource } from "@discordjs/voice";
export type HeartPersonalityType = "sweet" | "funny" | "gaming" | "royal" | "cute";
export type HeartLanguage = "en" | "te" | "mixed";
export interface GreetingPromptContext {
    username: string;
    personality: HeartPersonalityType;
    language: HeartLanguage;
    isFirstTime?: boolean;
    daysAbsent?: number;
    memberCountInRoom: number;
}
export interface AppreciationPromptContext {
    username: string;
    milestoneName: string;
    durationMinutes: number;
    personality: HeartPersonalityType;
    language: HeartLanguage;
}
export declare class HeartPersonalityService {
    /**
     * Built-in template pools for instant zero-latency responses or offline fallback.
     */
    private readonly greetingTemplates;
    /**
     * Built-in milestone appreciation templates.
     */
    private readonly appreciationTemplates;
    /**
     * Generates a sweet, personalized greeting for a member entering a voice room.
     */
    generateGreeting(context: GreetingPromptContext): Promise<string>;
    /**
     * Generates an intelligent appreciation celebration message when a member hits a voice duration milestone.
     */
    generateAppreciation(context: AppreciationPromptContext): Promise<string>;
    /**
     * Synthesize natural speech audio stream from text via Google TTS (zero local bloat).
     * Compatible with @discordjs/voice createAudioResource.
     */
    synthesizeSpeechAudio(text: string, language?: HeartLanguage): Promise<AudioResource>;
}
export declare const heartPersonalityService: HeartPersonalityService;
