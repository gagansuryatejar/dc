/**
 * Community Pulse Service for NEXUS AI.
 * Analyzes community discussions, sentiment, trending topics, and provides
 * actionable engagement insights for server administrators.
 */

import { aiOrchestrator } from "./ai-orchestrator.service.js";
import { createModuleLogger } from "../../../utils/logger.js";

const logger = createModuleLogger("service:community-pulse");

export interface PulseAnalysis {
  guildId: string;
  sampleSize: number;
  prevailingMood: string;
  sentimentScore: number; // -1.0 to 1.0
  sentimentLabel: "Positive" | "Neutral" | "Negative" | "Enthusiastic" | "Constructive";
  trendingTopics: string[];
  keyHighlights: string[];
  engagementHealth: "thriving" | "healthy" | "quiet" | "concerning";
  actionableAdvice: string;
  analyzedAt: string;
}

export class CommunityPulseService {
  private cache: Map<string, { analysis: PulseAnalysis; expiresAt: number }> = new Map();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Analyzes community sentiment, mood, and discussion topics.
   */
  async analyzePulse(
    guildId: string,
    sampleMessages: string[],
    forceRefresh: boolean = false,
  ): Promise<PulseAnalysis> {
    const cached = this.cache.get(guildId);
    if (!forceRefresh && cached && Date.now() < cached.expiresAt) {
      return cached.analysis;
    }

    if (!sampleMessages || sampleMessages.length === 0) {
      const defaultPulse = this.generateDefaultPulse(guildId, 0);
      this.cache.set(guildId, { analysis: defaultPulse, expiresAt: Date.now() + this.CACHE_TTL_MS });
      return defaultPulse;
    }

    try {
      // Prompt LLM for structured pulse analysis if available
      const prompt = `Perform a community sentiment and discussion pulse analysis on the following server messages.
Output your analysis in strict JSON format with keys:
- "prevailingMood": short adjective (e.g. "enthusiastic", "friendly", "focused", "curious", "casual")
- "sentimentScore": number between -1.0 and 1.0
- "sentimentLabel": one of "Positive", "Neutral", "Negative", "Enthusiastic", "Constructive"
- "trendingTopics": array of 3-5 short keywords/phrases
- "keyHighlights": array of 2-3 key discussion points or questions
- "engagementHealth": one of "thriving", "healthy", "quiet", "concerning"
- "actionableAdvice": 1-2 practical tips for moderators to boost community engagement

Messages:
${sampleMessages.slice(0, 30).map((m, i) => `${i + 1}. ${m}`).join("\n")}`;

      const aiResponse = await aiOrchestrator.generate(
        guildId,
        "system",
        prompt,
        { mode: "concise" },
      );

      // Attempt parsing JSON from LLM response
      const jsonMatch = aiResponse.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          const analysis: PulseAnalysis = {
            guildId,
            sampleSize: sampleMessages.length,
            prevailingMood: parsed.prevailingMood || "Casual & Friendly",
            sentimentScore: typeof parsed.sentimentScore === "number" ? parsed.sentimentScore : 0.5,
            sentimentLabel: parsed.sentimentLabel || "Positive",
            trendingTopics: Array.isArray(parsed.trendingTopics) ? parsed.trendingTopics : ["General Chat"],
            keyHighlights: Array.isArray(parsed.keyHighlights) ? parsed.keyHighlights : ["Active conversation in progress"],
            engagementHealth: parsed.engagementHealth || "healthy",
            actionableAdvice: parsed.actionableAdvice || "Host an impromptu voice room or game event.",
            analyzedAt: new Date().toISOString(),
          };

          this.cache.set(guildId, { analysis, expiresAt: Date.now() + this.CACHE_TTL_MS });
          return analysis;
        } catch {
          // Fall through to heuristic engine
        }
      }
    } catch (err) {
      logger.warn({ err, guildId }, "AI provider unavailable for pulse, using local NLP heuristic");
    }

    // Heuristic NLP analysis fallback (zero API costs, runs on HP All-in-One 4GB RAM)
    const analysis = this.analyzeHeuristic(guildId, sampleMessages);
    this.cache.set(guildId, { analysis, expiresAt: Date.now() + this.CACHE_TTL_MS });
    return analysis;
  }

  /**
   * Deterministic local NLP sentiment and keyword extractor for fast offline analysis.
   */
  private analyzeHeuristic(guildId: string, messages: string[]): PulseAnalysis {
    const text = messages.join(" ").toLowerCase();

    // Sentiment word dictionaries
    const positiveWords = ["great", "awesome", "love", "good", "nice", "fun", "cool", "hype", "win", "thanks", "lol", "haha", "best", "gg", "excited"];
    const negativeWords = ["bad", "hate", "terrible", "awful", "boring", "toxic", "lag", "bug", "error", "fail", "sad", "angry", "worst", "broken"];
    const curiousWords = ["why", "how", "what", "when", "who", "question", "help", "anyone", "wonder", "where"];

    let posCount = 0;
    let negCount = 0;
    let curiousCount = 0;

    for (const word of positiveWords) {
      const matches = text.match(new RegExp(`\\b${word}\\b`, "g"));
      if (matches) posCount += matches.length;
    }

    for (const word of negativeWords) {
      const matches = text.match(new RegExp(`\\b${word}\\b`, "g"));
      if (matches) negCount += matches.length;
    }

    for (const word of curiousWords) {
      const matches = text.match(new RegExp(`\\b${word}\\b`, "g"));
      if (matches) curiousCount += matches.length;
    }

    const totalSentimentWords = Math.max(1, posCount + negCount);
    const scoreRaw = (posCount - negCount) / totalSentimentWords;
    const sentimentScore = Math.round(scoreRaw * 100) / 100;

    let sentimentLabel: PulseAnalysis["sentimentLabel"] = "Neutral";
    let prevailingMood = "Chill & Casual";

    if (sentimentScore >= 0.4) {
      sentimentLabel = "Enthusiastic";
      prevailingMood = "Enthusiastic & High Energy";
    } else if (sentimentScore > 0.1) {
      sentimentLabel = "Positive";
      prevailingMood = "Friendly & Collaborative";
    } else if (sentimentScore < -0.2) {
      sentimentLabel = "Negative";
      prevailingMood = "Tense / Frustrated";
    } else if (curiousCount >= 3) {
      sentimentLabel = "Constructive";
      prevailingMood = "Inquisitive & Curious";
    }

    // Extract keyword frequencies
    const words = text
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w) => w.length > 4 && !["about", "there", "their", "which", "would", "could", "should", "really"].includes(w));

    const freqMap = new Map<string, number>();
    for (const w of words) {
      freqMap.set(w, (freqMap.get(w) || 0) + 1);
    }

    const sortedTopics = Array.from(freqMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));

    const trendingTopics = sortedTopics.length > 0 ? sortedTopics : ["General Chat", "Gaming", "Community"];

    // Key highlights
    const highlights = messages.slice(0, 3).map((m) => m.length > 60 ? m.slice(0, 57) + "..." : m);

    // Engagement health
    let engagementHealth: PulseAnalysis["engagementHealth"] = "healthy";
    if (messages.length >= 25 && sentimentScore >= 0) {
      engagementHealth = "thriving";
    } else if (messages.length < 5) {
      engagementHealth = "quiet";
    } else if (sentimentScore < -0.3) {
      engagementHealth = "concerning";
    }

    // Actionable advice
    let actionableAdvice = "Engagement is steady. Keep general discussions active.";
    if (engagementHealth === "thriving") {
      actionableAdvice = "Server is active! Perfect time to announce an upcoming community event or stream.";
    } else if (engagementHealth === "quiet") {
      actionableAdvice = "Activity is slow. Consider posting a discussion prompt or launching a trivia game.";
    } else if (sentimentScore < -0.2) {
      actionableAdvice = "Noticeable tension detected. Check recent audit logs or review member reports.";
    }

    return {
      guildId,
      sampleSize: messages.length,
      prevailingMood,
      sentimentScore,
      sentimentLabel,
      trendingTopics,
      keyHighlights: highlights.length > 0 ? highlights : ["No notable quotes in sample."],
      engagementHealth,
      actionableAdvice,
      analyzedAt: new Date().toISOString(),
    };
  }

  private generateDefaultPulse(guildId: string, sampleSize: number): PulseAnalysis {
    return {
      guildId,
      sampleSize,
      prevailingMood: "Quiet & Peaceful",
      sentimentScore: 0.0,
      sentimentLabel: "Neutral",
      trendingTopics: ["Welcome", "General"],
      keyHighlights: ["No recent messages found in sample."],
      engagementHealth: "quiet",
      actionableAdvice: "Start a conversation or trigger an AI game to awaken chat activity.",
      analyzedAt: new Date().toISOString(),
    };
  }
}

export const communityPulseService = new CommunityPulseService();
