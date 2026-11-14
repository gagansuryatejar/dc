/**
 * Google Gemini cloud AI provider for NEXUS AI.
 * Communicates with Google's Gemini models via REST with zero native bloat.
 */
import type { AIProvider, AIMessage, GenerateOptions, AIResponse } from "./ai-provider.interface.js";
export declare class GeminiProvider implements AIProvider {
    readonly name = "gemini";
    private readonly model;
    private readonly apiKey;
    isAvailable(): boolean;
    generateResponse(messages: AIMessage[], options?: GenerateOptions): Promise<AIResponse>;
    healthCheck(): Promise<boolean>;
}
export declare const geminiProvider: GeminiProvider;
