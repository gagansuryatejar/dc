/**
 * NEXUS AI — Poll Repository
 * Creates polls with multiple options, records votes, tallies results.
 */

import { prisma } from "../../../database/client.js";
import type { Poll } from "@prisma/client";

export interface CreatePollInput {
  guildId: string;
  creatorId: string;
  channelId: string;
  question: string;
  options: string[];
  allowMultiple?: boolean;
  expiresAt?: Date;
}

export interface PollWithTally extends Poll {
  tally: number[];
  totalVotes: number;
  userVote?: number | null;
}

/** Create a new poll. */
export async function create(input: CreatePollInput): Promise<Poll> {
  return prisma.poll.create({
    data: {
      guildId: input.guildId,
      creatorId: input.creatorId,
      channelId: input.channelId,
      question: input.question,
      options: JSON.stringify(input.options),
      allowMultiple: input.allowMultiple ?? false,
      expiresAt: input.expiresAt,
    },
  });
}

/** Find poll by ID. */
export async function findById(id: string): Promise<Poll | null> {
  return prisma.poll.findUnique({ where: { id } });
}

/** Get poll by message ID. */
export async function findByMessageId(messageId: string): Promise<Poll | null> {
  return prisma.poll.findFirst({ where: { messageId } });
}

/** Get active polls for a guild. */
export async function findActiveByGuild(guildId: string): Promise<PollWithTally[]> {
  const polls = await prisma.poll.findMany({
    where: {
      guildId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return polls.map((p) => ({
    ...p,
    options: typeof p.options === "string" ? JSON.parse(p.options) : p.options,
    tally: [],
    totalVotes: 0,
  }));
}

/** Record a vote on a poll. */
export async function recordVote(
  pollId: string,
  userId: string,
  optionIndex: number,
): Promise<PollWithTally> {
  const poll = await prisma.poll.findUnique({ where: { id: pollId } });
  if (!poll) throw new Error("Poll not found");

  const options = typeof poll.options === "string" ? JSON.parse(poll.options) : poll.options;
  if (optionIndex < 0 || optionIndex >= options.length) throw new Error("Invalid option index");

  if (poll.allowMultiple) {
    await prisma.pollVote.upsert({
      where: { pollId_userId_optionIndex: { pollId, userId, optionIndex } },
      update: {},
      create: { pollId, userId, optionIndex },
    });
  } else {
    await prisma.pollVote.deleteMany({ where: { pollId, userId } });
    await prisma.pollVote.create({ data: { pollId, userId, optionIndex } });
  }

  const votes = await prisma.pollVote.findMany({ where: { pollId } });
  const tally = new Array(options.length).fill(0);
  for (const v of votes) {
    if (v.optionIndex >= 0 && v.optionIndex < tally.length) {
      tally[v.optionIndex]++;
    }
  }

  return {
    ...poll,
    options: options,
    tally,
    totalVotes: votes.length,
  };
}

/** Close a poll (deactivate). */
export async function closePoll(id: string): Promise<Poll> {
  return prisma.poll.update({ where: { id }, data: { isActive: false } });
}

/** Set the Discord message ID for a poll. */
export async function setMessageId(id: string, messageId: string): Promise<Poll> {
  return prisma.poll.update({ where: { id }, data: { messageId } });
}

/** Get user's votes on a poll. */
export async function getUserVotes(pollId: string, userId: string): Promise<number[]> {
  const votes = await prisma.pollVote.findMany({
    where: { pollId, userId },
    select: { optionIndex: true },
  });
  return votes.map((v) => v.optionIndex);
}

/** Remove a user's vote from a poll. */
export async function removeVote(pollId: string, userId: string): Promise<void> {
  await prisma.pollVote.deleteMany({ where: { pollId, userId } });
}

/** Namespace export for test compatibility. */
export const pollRepository = {
  create,
  findById,
  findByMessageId,
  findActiveByGuild,
  recordVote,
  closePoll,
  setMessageId,
  getUserVotes,
  removeVote,
};