/**
 * OpenAI cloud AI provider for NEXUS AI.
 * Communicates with OpenAI-compatible REST endpoints.
 */
import type { AIProvider, AIMessage, GenerateOptions, AIResponse } from "./ai-provider.interface.js";
export declare class OpenAIProvider implements AIProvider {
    readonly name = "openai";
    private readonly model;
    private readonly apiKey;
    isAvailable(): boolean;
    generateResponse(messages: AIMessage[], options?: GenerateOptions): Promise<AIResponse>;
    healthCheck(): Promise<boolean>;
}
export declare const openAIProvider: OpenAIProvider;
