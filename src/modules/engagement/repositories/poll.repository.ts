/**
 * Poll repository for NEXUS AI.
 */

import { type Poll } from "@prisma/client";
import { prisma } from "../../../database/index.js";

export class PollRepository {
  async create(data: {
    guildId: string;
    creatorId: string;
    channelId: string;
    messageId?: string;
    question: string;
    options: string[];
    expiresAt?: Date;
  }): Promise<Poll> {
    return prisma.poll.create({
      data: {
        guildId: data.guildId,
        creatorId: data.creatorId,
        channelId: data.channelId,
        messageId: data.messageId,
        question: data.question,
        options: JSON.stringify(data.options),
        votes: "{}",
        expiresAt: data.expiresAt,
      },
    });
  }

  async findById(id: string): Promise<Poll | null> {
    return prisma.poll.findUnique({ where: { id } });
  }

  async findByMessageId(messageId: string): Promise<Poll | null> {
    return prisma.poll.findFirst({ where: { messageId } });
  }

  async update(id: string, data: Partial<Poll>): Promise<Poll> {
    return prisma.poll.update({
      where: { id },
      data,
    });
  }

  async recordVote(
    pollId: string,
    userId: string,
    optionIndex: number,
  ): Promise<{ poll: Poll; tally: Record<number, number>; totalVotes: number }> {
    const poll = await this.findById(pollId);
    if (!poll) throw new Error("Poll not found");

    const votesMap: Record<string, number> = JSON.parse(poll.votes || "{}");
    votesMap[userId] = optionIndex;

    const updated = await prisma.poll.update({
      where: { id: pollId },
      data: { votes: JSON.stringify(votesMap) },
    });

    const tally: Record<number, number> = {};
    for (const optIdx of Object.values(votesMap)) {
      tally[optIdx] = (tally[optIdx] || 0) + 1;
    }

    return {
      poll: updated,
      tally,
      totalVotes: Object.keys(votesMap).length,
    };
  }
}

export const pollRepository = new PollRepository();
