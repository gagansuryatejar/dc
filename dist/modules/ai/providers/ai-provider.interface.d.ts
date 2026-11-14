/**
 * AI Provider interface and message contracts for NEXUS AI.
 */
export interface AIMessage {
    role: "system" | "user" | "assistant";
    content: string;
}
export interface GenerateOptions {
    temperature?: number;
    maxTokens?: number;
    language?: "en" | "te";
    systemPromptOverride?: string;
}
export interface AIResponse {
    text: string;
    provider: string;
    model: string;
    tokensUsed?: number;
}
export interface AIProvider {
    readonly name: string;
    isAvailable(): boolean;
    generateResponse(messages: AIMessage[], options?: GenerateOptions): Promise<AIResponse>;
    healthCheck(): Promise<boolean>;
}
