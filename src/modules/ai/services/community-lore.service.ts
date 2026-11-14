/**
 * Community Memory & Server Lore Service for NEXUS AI.
 * Stores shared community lore, memorable server quotes, inside jokes,
 * and milestones in SQLite persistence.
 */

import { prisma } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";

const logger = createModuleLogger("service:community-lore");

export interface AddLoreInput {
  topic: string;
  content: string;
  submittedBy: string;
  submitterTag?: string;
  category?: "lore" | "quote" | "milestone" | "inside_joke";
}

export class CommunityLoreService {
  /**
   * Normalizes a topic string to lowercase alphanumeric slugs.
   */
  private normalizeTopic(topic: string): string {
    return topic.trim().toLowerCase().replace(/\s+/g, "_");
  }

  /**
   * Records a new entry into server collective memory.
   */
  async addLore(guildId: string, input: AddLoreInput) {
    const topic = this.normalizeTopic(input.topic);

    try {
      const entry = await prisma.serverLore.create({
        data: {
          guildId,
          topic,
          content: input.content.trim(),
          submittedBy: input.submittedBy,
          submitterTag: input.submitterTag,
          category: input.category || "lore",
        },
      });

      logger.info({ guildId, topic, category: input.category }, "Added new server lore entry");
      return entry;
    } catch (error) {
      logger.error({ error, guildId, topic }, "Failed to persist server lore");
      throw error;
    }
  }

  /**
   * Searches for a lore entry by topic name or keyword.
   */
  async getLore(guildId: string, topicQuery: string) {
    const normalized = this.normalizeTopic(topicQuery);

    // Exact topic match
    const exact = await prisma.serverLore.findFirst({
      where: {
        guildId,
        topic: normalized,
      },
    });

    if (exact) return exact;

    // Partial/contains match
    return prisma.serverLore.findFirst({
      where: {
        guildId,
        OR: [
          { topic: { contains: normalized } },
          { content: { contains: topicQuery.trim() } },
        ],
      },
      orderBy: { upvotes: "desc" },
    });
  }

  /**
   * Lists lore entries with optional category filtering.
   */
  async listLore(guildId: string, category?: string, limit: number = 20) {
    return prisma.serverLore.findMany({
      where: {
        guildId,
        category: category ? category : undefined,
      },
      orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
      take: Math.min(100, limit),
    });
  }

  /**
   * Returns a random lore entry or memorable quote from the server.
   */
  async getRandomLore(guildId: string) {
    const count = await prisma.serverLore.count({ where: { guildId } });
    if (count === 0) return null;

    const skip = Math.floor(Math.random() * count);
    const results = await prisma.serverLore.findMany({
      where: { guildId },
      skip,
      take: 1,
    });

    return results[0] || null;
  }

  /**
   * Upvotes a lore entry.
   */
  async upvoteLore(guildId: string, loreId: string) {
    logger.debug({ guildId, loreId }, "Lore entry upvoted");
    return prisma.serverLore.update({
      where: { id: loreId },
      data: { upvotes: { increment: 1 } },
    });
  }

  /**
   * Deletes a lore entry. Ensures only creator or admin can remove.
   */
  async deleteLore(guildId: string, topicQuery: string, requesterId: string, isAdmin: boolean) {
    const entry = await this.getLore(guildId, topicQuery);
    if (!entry) return { success: false, reason: "Entry not found" };

    if (!isAdmin && entry.submittedBy !== requesterId) {
      return { success: false, reason: "You do not have permission to delete this entry" };
    }

    await prisma.serverLore.delete({ where: { id: entry.id } });
    logger.info({ guildId, topic: entry.topic }, "Deleted server lore entry");
    return { success: true, entry };
  }
}

export const communityLoreService = new CommunityLoreService();
