/**
 * Non-AI Intelligent Fallback Provider for NEXUS AI.
 * Ensures the bot remains interactive, conversational, and helpful even when
 * cloud AI APIs are unconfigured, offline, or rate-limited.
 * Supports both English and Telugu queries.
 */
import type { AIProvider, AIMessage, GenerateOptions, AIResponse } from "./ai-provider.interface.js";
export declare class FallbackProvider implements AIProvider {
    readonly name = "fallback-rules";
    isAvailable(): boolean;
    generateResponse(messages: AIMessage[], options?: GenerateOptions): Promise<AIResponse>;
    healthCheck(): Promise<boolean>;
}
export declare const fallbackProvider: FallbackProvider;
