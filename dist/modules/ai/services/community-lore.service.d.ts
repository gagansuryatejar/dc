/**
 * Community Memory & Server Lore Service for NEXUS AI.
 * Stores shared community lore, memorable server quotes, inside jokes,
 * and milestones in SQLite persistence.
 */
export interface AddLoreInput {
    topic: string;
    content: string;
    submittedBy: string;
    submitterTag?: string;
    category?: "lore" | "quote" | "milestone" | "inside_joke";
}
export declare class CommunityLoreService {
    /**
     * Normalizes a topic string to lowercase alphanumeric slugs.
     */
    private normalizeTopic;
    /**
     * Records a new entry into server collective memory.
     */
    addLore(guildId: string, input: AddLoreInput): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        content: string;
        upvotes: number;
        category: string;
        topic: string;
        submittedBy: string;
        submitterTag: string | null;
    }>;
    /**
     * Searches for a lore entry by topic name or keyword.
     */
    getLore(guildId: string, topicQuery: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        content: string;
        upvotes: number;
        category: string;
        topic: string;
        submittedBy: string;
        submitterTag: string | null;
    } | null>;
    /**
     * Lists lore entries with optional category filtering.
     */
    listLore(guildId: string, category?: string, limit?: number): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        content: string;
        upvotes: number;
        category: string;
        topic: string;
        submittedBy: string;
        submitterTag: string | null;
    }[]>;
    /**
     * Returns a random lore entry or memorable quote from the server.
     */
    getRandomLore(guildId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        content: string;
        upvotes: number;
        category: string;
        topic: string;
        submittedBy: string;
        submitterTag: string | null;
    } | null>;
    /**
     * Upvotes a lore entry.
     */
    upvoteLore(guildId: string, loreId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        guildId: string;
        content: string;
        upvotes: number;
        category: string;
        topic: string;
        submittedBy: string;
        submitterTag: string | null;
    }>;
    /**
     * Deletes a lore entry. Ensures only creator or admin can remove.
     */
    deleteLore(guildId: string, topicQuery: string, requesterId: string, isAdmin: boolean): Promise<{
        success: boolean;
        reason: string;
        entry?: undefined;
    } | {
        success: boolean;
        entry: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            guildId: string;
            content: string;
            upvotes: number;
            category: string;
            topic: string;
            submittedBy: string;
            submitterTag: string | null;
        };
        reason?: undefined;
    }>;
}
export declare const communityLoreService: CommunityLoreService;
