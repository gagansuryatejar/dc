/**
 * AI Orchestration Engine for NEXUS AI.
 * Coordinates multi-provider execution (Gemini, OpenAI, Fallback),
 * response caching, conversation memory injection, and multilingual support (English & Telugu).
 */
import type { AIMessage, AIResponse, GenerateOptions } from "../providers/ai-provider.interface.js";
export interface AskOptions {
    mode?: "normal" | "creative" | "concise" | "telugu";
    useMemory?: boolean;
}
export declare class AIOrchestratorService {
    private readonly providers;
    private readonly responseCache;
    private readonly userLimiter;
    constructor();
    /**
     * Build the comprehensive NEXUS AI system instruction prompt.
     */
    private buildSystemPrompt;
    /**
     * Checks and consumes rate limit for a user.
     */
    checkRateLimit(userId: string): import("../../../security/rate-limiter.js").RateLimitResult;
    /**
     * Primary conversational query handler.
     */
    ask(guildId: string, userId: string, username: string, query: string, options?: AskOptions): Promise<AIResponse>;
    /**
     * Summarizes channel discussion context.
     */
    summarize(_guildId: string, channelName: string, recentMessages: string[]): Promise<string>;
    /**
     * Drafts an attractive community announcement.
     */
    draftAnnouncement(_guildId: string, topic: string, tone?: string): Promise<string>;
    getActiveProviders(): string[];
    /**
     * Generic prompt generator for helper services (Pulse, Companion, Trivia).
     */
    generate(_guildId: string, systemPrompt: string, userPrompt: string, _options?: {
        mode?: string;
    }): Promise<{
        content: string;
        provider: string;
    }>;
    /**
     * Directly generates response using provider fallback chain (Gemini -> OpenAI -> Fallback).
     */
    generateResponse(messages: AIMessage[], options?: GenerateOptions): Promise<AIResponse>;
}
export declare const aiOrchestratorService: AIOrchestratorService;
export declare const aiOrchestrator: AIOrchestratorService;
