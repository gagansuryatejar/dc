/**
 * Community Pulse Service for NEXUS AI.
 * Analyzes community discussions, sentiment, trending topics, and provides
 * actionable engagement insights for server administrators.
 */
export interface PulseAnalysis {
    guildId: string;
    sampleSize: number;
    prevailingMood: string;
    sentimentScore: number;
    sentimentLabel: "Positive" | "Neutral" | "Negative" | "Enthusiastic" | "Constructive";
    trendingTopics: string[];
    keyHighlights: string[];
    engagementHealth: "thriving" | "healthy" | "quiet" | "concerning";
    actionableAdvice: string;
    analyzedAt: string;
}
export declare class CommunityPulseService {
    private cache;
    private readonly CACHE_TTL_MS;
    /**
     * Analyzes community sentiment, mood, and discussion topics.
     */
    analyzePulse(guildId: string, sampleMessages: string[], forceRefresh?: boolean): Promise<PulseAnalysis>;
    /**
     * Deterministic local NLP sentiment and keyword extractor for fast offline analysis.
     */
    private analyzeHeuristic;
    private generateDefaultPulse;
}
export declare const communityPulseService: CommunityPulseService;
