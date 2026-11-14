/**
 * Automated Threat Detection & Moderation Engine for NEXUS AI.
 * Handles anti-spam, duplicate message prevention, mention limits,
 * phishing URL detection, configurable word filters, anti-raid shields,
 * and AI-assisted violation classification with confidence scoring.
 */
export interface ModerationAnalysisResult {
    flagged: boolean;
    violationType?: "spam" | "duplicate" | "mention_spam" | "phishing" | "filtered_word";
    reason?: string;
    confidence: number;
    matchedPattern?: string;
    recommendedAction: "none" | "delete" | "warn" | "timeout";
}
export interface JoinAnalysisResult {
    isRaid: boolean;
    isSuspiciousAccount: boolean;
    accountAgeHours: number;
    reason?: string;
}
export declare class AutomodService {
    private readonly spamLimiter;
    private readonly duplicateTracker;
    private readonly raidTracker;
    private readonly raidShieldManualMode;
    private readonly phishingPatterns;
    constructor();
    /**
     * Normalizes text by removing leetspeak, spaces, and duplicate characters.
     */
    normalizeText(text: string): string;
    /**
     * Analyzes an incoming chat message against all automated filters.
     */
    analyzeMessage(guildId: string, userId: string, content: string, mentionCount?: number): Promise<ModerationAnalysisResult>;
    /**
     * Analyzes a newly joined member for raid conditions or suspicious accounts.
     */
    analyzeJoin(guildId: string, accountCreatedAt: Date, now?: number): JoinAnalysisResult;
    /**
     * Toggles manual raid shield status.
     */
    setRaidShield(guildId: string, enabled: boolean): void;
    isRaidShieldActive(guildId: string): boolean;
}
export declare const automodService: AutomodService;
