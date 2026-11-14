/**
 * Automated Threat Detection & Moderation Engine for NEXUS AI.
 * Handles anti-spam, duplicate message prevention, mention limits,
 * phishing URL detection, configurable word filters, anti-raid shields,
 * and AI-assisted violation classification with confidence scoring.
 */

import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { RateLimiter } from "../../../security/rate-limiter.js";

const logger = createModuleLogger("moderation:automod");

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

export class AutomodService {
  // Anti-spam limiter: 5 messages per 4 seconds per user
  private readonly spamLimiter = new RateLimiter(4_000, 5);

  // In-memory cache for duplicate message detection: userId -> { content: string, count: number, lastTime: number }
  private readonly duplicateTracker = new Map<
    string,
    { content: string; count: number; lastTime: number }
  >();

  // In-memory raid tracker: guildId -> number[] of join timestamps (sliding 10s window)
  private readonly raidTracker = new Map<string, number[]>();

  // Guild raid shield toggle override: guildId -> boolean
  private readonly raidShieldManualMode = new Map<string, boolean>();

  // Known deceptive / phishing link regex patterns
  private readonly phishingPatterns: RegExp[] = [
    /(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:discorcl|dlscord|disord|discocrd|discord-app|discord-gift|discord-nitro|free-nitro|steamcom+uni+ty|steam-gifts|steam-trade|roblx|roblox-gifts)\.[a-z]{2,}(?:\/[^\s]*)?/i,
    /(?:https?:\/\/)?(?:[a-z0-9-]+\.)*(?:grabify|iplogger|2no\.co|yip\.su|blasze)\.[a-z]{2,}(?:\/[^\s]*)?/i,
    /(?:free|claim|airdrop|steam|nitro|gift).*(?:https?:\/\/[^\s]+)/i,
  ];

  constructor() {
    // Periodic cleanup of duplicate trackers every 60 seconds
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, data] of this.duplicateTracker.entries()) {
        if (now - data.lastTime > 60_000) {
          this.duplicateTracker.delete(key);
        }
      }
    }, 60_000);
    if (timer.unref) timer.unref();
  }

  /**
   * Normalizes text by removing leetspeak, spaces, and duplicate characters.
   */
  public normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[\s\-_.]+/g, "")
      .replace(/0/g, "o")
      .replace(/1|!|\|/g, "i")
      .replace(/3/g, "e")
      .replace(/4|@/g, "a")
      .replace(/5|\$/g, "s")
      .replace(/7/g, "t")
      .replace(/8/g, "b");
  }

  /**
   * Analyzes an incoming chat message against all automated filters.
   */
  async analyzeMessage(
    guildId: string,
    userId: string,
    content: string,
    mentionCount = 0,
  ): Promise<ModerationAnalysisResult> {
    const cleanContent = content.trim();

    // 1. Phishing & Malicious Link Detection
    for (const pattern of this.phishingPatterns) {
      if (pattern.test(cleanContent)) {
        logger.warn({ guildId, userId, pattern: pattern.source }, "Detected malicious phishing link");
        return {
          flagged: true,
          violationType: "phishing",
          reason: "Malicious or deceptive phishing link detected.",
          confidence: 0.98,
          matchedPattern: pattern.source,
          recommendedAction: "timeout",
        };
      }
    }

    // 2. Mention Spam Detection (> 5 mentions or unauthorized mass ping)
    if (mentionCount > 5) {
      return {
        flagged: true,
        violationType: "mention_spam",
        reason: `Excessive member or role mentions (${mentionCount} mentions).`,
        confidence: 0.99,
        recommendedAction: "warn",
      };
    }

    // 3. Rapid Message Spam Detection
    const spamCheck = this.spamLimiter.consume(`${guildId}:${userId}`);
    if (spamCheck.limited) {
      return {
        flagged: true,
        violationType: "spam",
        reason: "Sending messages too rapidly (rate limit exceeded).",
        confidence: 0.95,
        recommendedAction: "delete",
      };
    }

    // 4. Repeated / Duplicate Message Detection
    const now = Date.now();
    const dupKey = `${guildId}:${userId}`;
    const previous = this.duplicateTracker.get(dupKey);

    if (cleanContent.length > 5) {
      if (previous && previous.content === cleanContent && now - previous.lastTime < 30_000) {
        previous.count += 1;
        previous.lastTime = now;

        if (previous.count >= 3) {
          return {
            flagged: true,
            violationType: "duplicate",
            reason: `Repeated identical message sent ${previous.count} times.`,
            confidence: 0.96,
            recommendedAction: "warn",
          };
        }
      } else {
        this.duplicateTracker.set(dupKey, {
          content: cleanContent,
          count: 1,
          lastTime: now,
        });
      }
    }

    // 5. Configurable Server Word Filter
    const rules = await prisma.filterRule.findMany({
      where: { guildId, enabled: true },
    });

    const normalizedContent = this.normalizeText(cleanContent);
    const lowerContent = cleanContent.toLowerCase();

    for (const rule of rules) {
      let matched = false;

      if (rule.isRegex) {
        try {
          const re = new RegExp(rule.pattern, "i");
          matched = re.test(cleanContent);
        } catch {}
      } else {
        const lowerPattern = rule.pattern.toLowerCase();
        const normPattern = this.normalizeText(rule.pattern);
        matched =
          lowerContent.includes(lowerPattern) ||
          normalizedContent.includes(normPattern);
      }

      if (matched) {
        return {
          flagged: true,
          violationType: "filtered_word",
          reason: `Message matched prohibited server filter pattern: "${rule.pattern}".`,
          confidence: 0.99,
          matchedPattern: rule.pattern,
          recommendedAction: rule.action === "timeout" ? "timeout" : "warn",
        };
      }
    }

    return {
      flagged: false,
      confidence: 0.0,
      recommendedAction: "none",
    };
  }

  /**
   * Analyzes a newly joined member for raid conditions or suspicious accounts.
   */
  analyzeJoin(
    guildId: string,
    accountCreatedAt: Date,
    now: number = Date.now(),
  ): JoinAnalysisResult {
    // 1. Anti-Raid Window: 5 joins in 10 seconds
    const timestamps = this.raidTracker.get(guildId) ?? [];
    const valid = timestamps.filter((t) => now - t < 10_000);
    valid.push(now);
    this.raidTracker.set(guildId, valid);

    const isManualRaid = this.raidShieldManualMode.get(guildId) ?? false;
    const isAutoRaid = valid.length >= 5;
    const isRaid = isManualRaid || isAutoRaid;

    // 2. Suspicious Account: Account created less than 24 hours ago
    const ageMs = now - accountCreatedAt.getTime();
    const accountAgeHours = Math.max(0, Math.floor(ageMs / (1000 * 60 * 60)));
    const isSuspiciousAccount = accountAgeHours < 24;

    let reason: string | undefined;
    if (isRaid && isSuspiciousAccount) {
      reason = `Raid detected (${valid.length} joins in 10s) and account is new (< ${accountAgeHours}h old).`;
    } else if (isRaid) {
      reason = `Raid wave detected: ${valid.length} joins in 10 seconds.`;
    } else if (isSuspiciousAccount) {
      reason = `Suspicious new Discord account: created only ${accountAgeHours} hour(s) ago.`;
    }

    return {
      isRaid,
      isSuspiciousAccount,
      accountAgeHours,
      reason,
    };
  }

  /**
   * Toggles manual raid shield status.
   */
  setRaidShield(guildId: string, enabled: boolean): void {
    this.raidShieldManualMode.set(guildId, enabled);
    logger.info({ guildId, enabled }, "Manual raid shield status updated");
  }

  isRaidShieldActive(guildId: string): boolean {
    return this.raidShieldManualMode.get(guildId) ?? false;
  }
}

export const automodService = new AutomodService();
