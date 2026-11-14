/**
 * Conversational Memory Service for NEXUS AI.
 * Provides private, per-user conversation context with privacy isolation
 * and user-controlled data deletion.
 */

import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
import type { AIMessage } from "../providers/ai-provider.interface.js";

const logger = createModuleLogger("ai:memory");

export class MemoryService {
  /**
   * Retrieve recent conversation history for a specific user in a guild.
   * Strictly filtered by both guildId and userId to ensure privacy.
   */
  async getHistory(guildId: string, userId: string, limit = 20): Promise<AIMessage[]> {
    try {
      const records = await prisma.conversationMemory.findMany({
        where: { guildId, userId },
        orderBy: { createdAt: "desc" },
        take: limit,
      });

      // Return chronological order (oldest first)
      return records.reverse().map((r) => ({
        role: r.role as "user" | "assistant" | "system",
        content: r.content,
      }));
    } catch (error) {
      logger.error({ error, guildId, userId }, "Failed to fetch conversation memory");
      return [];
    }
  }

  /**
   * Store a message in the user's private conversational memory.
   */
  async addMessage(
    guildId: string,
    userId: string,
    role: "user" | "assistant",
    content: string,
  ): Promise<void> {
    try {
      await prisma.conversationMemory.create({
        data: {
          guildId,
          userId,
          role,
          content,
        },
      });

      // Keep maximum of 50 recent messages per user per guild (expanded for high-memory hosts)
      const excess = await prisma.conversationMemory.findMany({
        where: { guildId, userId },
        orderBy: { createdAt: "desc" },
        skip: 50,
        select: { id: true },
      });

      if (excess.length > 0) {
        await prisma.conversationMemory.deleteMany({
          where: { id: { in: excess.map((e) => e.id) } },
        });
      }
    } catch (error) {
      logger.error({ error, guildId, userId }, "Failed to persist conversation memory");
    }
  }

  /**
   * Clears all conversational memory for a specific member upon request.
   */
  async clearMemory(guildId: string, userId: string): Promise<number> {
    try {
      const result = await prisma.conversationMemory.deleteMany({
        where: { guildId, userId },
      });
      logger.info({ guildId, userId, deletedCount: result.count }, "Cleared conversation memory for user");
      return result.count;
    } catch (error) {
      logger.error({ error, guildId, userId }, "Failed to clear conversation memory");
      return 0;
    }
  }

  /**
   * Count total stored memory items for a user.
   */
  async getMemoryCount(guildId: string, userId: string): Promise<number> {
    return prisma.conversationMemory.count({
      where: { guildId, userId },
    });
  }
}

export const memoryService = new MemoryService();
