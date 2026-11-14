/**
 * Smart Voice Companion Service for NEXUS AI.
 * Provides voice room icebreakers, conversational discussion recaps,
 * and dynamic voice announcements.
 */
export interface VoiceIcebreaker {
    question: string;
    category: "general" | "gaming" | "deep" | "funny";
    followUp: string;
}
export interface VoiceRecap {
    channelName: string;
    topicsDiscussed: string[];
    keyTakeaways: string[];
    actionItems: string[];
    generatedAt: string;
}
export declare class VoiceCompanionService {
    private readonly defaultIcebreakers;
    /**
     * Generates a creative voice room icebreaker question.
     */
    generateIcebreaker(guildId: string, category?: "general" | "gaming" | "deep" | "funny"): Promise<VoiceIcebreaker>;
    /**
     * Generates a structured recap of a voice room session based on bulleted notes or transcripts.
     */
    generateMeetingRecap(guildId: string, channelName: string, notesOrPoints: string[]): Promise<VoiceRecap>;
    /**
     * Generates a spoken-style announcement script for voice events.
     */
    generateVoiceAnnouncement(guildId: string, title: string, details: string): Promise<string>;
}
export declare const voiceCompanionService: VoiceCompanionService;
