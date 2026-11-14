/**
 * Conversational Memory Service for NEXUS AI.
 * Provides private, per-user conversation context with privacy isolation
 * and user-controlled data deletion.
 */
import type { AIMessage } from "../providers/ai-provider.interface.js";
export declare class MemoryService {
    /**
     * Retrieve recent conversation history for a specific user in a guild.
     * Strictly filtered by both guildId and userId to ensure privacy.
     */
    getHistory(guildId: string, userId: string, limit?: number): Promise<AIMessage[]>;
    /**
     * Store a message in the user's private conversational memory.
     */
    addMessage(guildId: string, userId: string, role: "user" | "assistant", content: string): Promise<void>;
    /**
     * Clears all conversational memory for a specific member upon request.
     */
    clearMemory(guildId: string, userId: string): Promise<number>;
    /**
     * Count total stored memory items for a user.
     */
    getMemoryCount(guildId: string, userId: string): Promise<number>;
}
export declare const memoryService: MemoryService;
