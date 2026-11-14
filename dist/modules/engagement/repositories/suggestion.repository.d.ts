/**
 * Suggestion repository for NEXUS AI.
 */
import { type Suggestion } from "@prisma/client";
export declare class SuggestionRepository {
    create(data: {
        guildId: string;
        userId: string;
        username: string;
        content: string;
        channelId?: string;
        messageId?: string;
    }): Promise<Suggestion>;
    findById(id: string): Promise<Suggestion | null>;
    findByMessageId(messageId: string): Promise<Suggestion | null>;
    update(id: string, data: Partial<Suggestion>): Promise<Suggestion>;
    toggleVote(id: string, userId: string, type: "upvote" | "downvote"): Promise<{
        suggestion: Suggestion;
        upvoteCount: number;
        downvoteCount: number;
    }>;
    getRecent(guildId: string, limit?: number): Promise<Suggestion[]>;
}
export declare const suggestionRepository: SuggestionRepository;
