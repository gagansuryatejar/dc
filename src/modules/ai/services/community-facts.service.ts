/**
 * Community Facts & Approved Server Knowledge Base for NEXUS AI.
 * Stores server-specific FAQs, guidelines, schedules, and custom facts.
 */

import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import { sanitizeString } from "../../../security/validators.js";

const logger = createModuleLogger("ai:facts");

export class CommunityFactsService {
  async setFact(
    guildId: string,
    key: string,
    content: string,
    creatorId: string,
  ): Promise<void> {
    const cleanKey = sanitizeString(key.toLowerCase().trim(), 32);
    const cleanContent = sanitizeString(content, 1000);

    await prisma.communityFact.upsert({
      where: {
        guildId_key: { guildId, key: cleanKey },
      },
      update: {
        content: cleanContent,
        creatorId,
        updatedAt: new Date(),
      },
      create: {
        guildId,
        key: cleanKey,
        content: cleanContent,
        creatorId,
      },
    });

    logger.info({ guildId, key: cleanKey }, "Stored community fact");
  }

  async getFact(guildId: string, key: string): Promise<string | null> {
    const cleanKey = key.toLowerCase().trim();
    const fact = await prisma.communityFact.findUnique({
      where: {
        guildId_key: { guildId, key: cleanKey },
      },
    });
    return fact ? fact.content : null;
  }

  async getAllFacts(guildId: string): Promise<Array<{ key: string; content: string }>> {
    return prisma.communityFact.findMany({
      where: { guildId },
      select: { key: true, content: true },
      orderBy: { key: "asc" },
    });
  }

  async deleteFact(guildId: string, key: string): Promise<boolean> {
    const cleanKey = key.toLowerCase().trim();
    try {
      await prisma.communityFact.delete({
        where: {
          guildId_key: { guildId, key: cleanKey },
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Search for relevant facts based on user query keyword matching.
   */
  async findRelevantFacts(guildId: string, query: string): Promise<string[]> {
    const all = await this.getAllFacts(guildId);
    const lowerQuery = query.toLowerCase();
    const queryTokens = lowerQuery
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3);

    const matches: string[] = [];
    for (const fact of all) {
      const keyWords = fact.key.toLowerCase().split(/[-_\s]+/);
      const contentLower = fact.content.toLowerCase();

      // Check if any key part matches the query, or query tokens match the key
      const keyMatches =
        lowerQuery.includes(fact.key) ||
        keyWords.some((kw) => queryTokens.includes(kw) || lowerQuery.includes(kw));

      // Check if any query token is present in the content
      const contentMatches = queryTokens.some((token) => contentLower.includes(token));

      if (keyMatches || contentMatches) {
        matches.push(`• [${fact.key.toUpperCase()}]: ${fact.content}`);
      }
    }
    return matches;
  }
}

export const communityFactsService = new CommunityFactsService();
