/**
 * Community Facts & Approved Server Knowledge Base for NEXUS AI.
 * Stores server-specific FAQs, guidelines, schedules, and custom facts.
 */
export declare class CommunityFactsService {
    setFact(guildId: string, key: string, content: string, creatorId: string): Promise<void>;
    getFact(guildId: string, key: string): Promise<string | null>;
    getAllFacts(guildId: string): Promise<Array<{
        key: string;
        content: string;
    }>>;
    deleteFact(guildId: string, key: string): Promise<boolean>;
    /**
     * Search for relevant facts based on user query keyword matching.
     */
    findRelevantFacts(guildId: string, query: string): Promise<string[]>;
}
export declare const communityFactsService: CommunityFactsService;
