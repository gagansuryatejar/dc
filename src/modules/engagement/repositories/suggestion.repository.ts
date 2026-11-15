/**
 * NEXUS AI — Suggestion Repository
 * CRUD operations for community suggestions with upvote/downvote tracking.
 */

import { prisma } from "../../../database/client.js";
import type { Suggestion } from "@prisma/client";

export interface CreateSuggestionInput {
  guildId: string;
  userId: string;
  username: string;
  content: string;
}

export interface SuggestionWithVotes extends Suggestion {
  upvoteCount: number;
  downvoteCount: number;
  userVote?: "upvote" | "downvote" | null;
}

/** Create a new suggestion. */
export async function create(input: CreateSuggestionInput): Promise<Suggestion> {
  return prisma.suggestion.create({
    data: {
      guildId: input.guildId,
      userId: input.userId,
      username: input.username,
      content: input.content,
    },
  });
}

/** Find suggestion by ID. */
export async function findById(id: string): Promise<Suggestion | null> {
  return prisma.suggestion.findUnique({ where: { id } });
}

/** Get suggestions for a guild with pagination. */
export async function findByGuild(
  guildId: string,
  options: { limit?: number; offset?: number; status?: string } = {},
): Promise<SuggestionWithVotes[]> {
  const { limit = 20, offset = 0, status } = options;
  const suggestions = await prisma.suggestion.findMany({
    where: { guildId, ...(status ? { status } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });

  // Get vote counts for each suggestion
  const suggestionIds = suggestions.map((s) => s.id);
  const votes = await prisma.suggestionVote.groupBy({
    by: ["suggestionId", "voteType"],
    where: { suggestionId: { in: suggestionIds } },
    _count: { voteType: true },
  });

  const voteMap = new Map<string, { up: number; down: number }>();
  for (const v of votes) {
    const entry = voteMap.get(v.suggestionId) || { up: 0, down: 0 };
    if (v.voteType === "upvote") entry.up = v._count.voteType;
    else entry.down = v._count.voteType;
    voteMap.set(v.suggestionId, entry);
  }

  return suggestions.map((s) => {
    const vm = voteMap.get(s.id) || { up: 0, down: 0 };
    return {
      ...s,
      upvoteCount: vm.up,
      downvoteCount: vm.down,
    };
  });
}

/** Toggle a user's vote on a suggestion. */
export async function toggleVote(
  suggestionId: string,
  userId: string,
  voteType: "upvote" | "downvote",
): Promise<{ upvoteCount: number; downvoteCount: number }> {
  const existing = await prisma.suggestionVote.findUnique({
    where: { suggestionId_userId: { suggestionId, userId } },
  });

  if (existing) {
    if (existing.voteType === voteType) {
      // Toggle off
      await prisma.suggestionVote.delete({ where: { id: existing.id } });
    } else {
      // Switch vote type
      await prisma.suggestionVote.update({
        where: { id: existing.id },
        data: { voteType },
      });
    }
  } else {
    // New vote
    await prisma.suggestionVote.create({
      data: { suggestionId, userId, voteType },
    });
  }

  // Return updated counts
  const counts = await prisma.suggestionVote.groupBy({
    by: ["voteType"],
    where: { suggestionId },
    _count: { voteType: true },
  });

  let up = 0, down = 0;
  for (const c of counts) {
    if (c.voteType === "upvote") up = c._count.voteType;
    else down = c._count.voteType;
  }
  return { upvoteCount: up, downvoteCount: down };
}

/** Get a user's vote on a suggestion. */
export async function getUserVote(
  suggestionId: string,
  userId: string,
): Promise<"upvote" | "downvote" | null> {
  const vote = await prisma.suggestionVote.findUnique({
    where: { suggestionId_userId: { suggestionId, userId } },
  });
  return (vote?.voteType as "upvote" | "downvote" | null) ?? null;
}

/** Update suggestion status (open, accepted, rejected, implemented). */
export async function updateStatus(
  id: string,
  status: "open" | "accepted" | "rejected" | "implemented",
): Promise<Suggestion> {
  return prisma.suggestion.update({ where: { id }, data: { status } });
}

/** Delete a suggestion. */
export async function deleteSuggestion(id: string): Promise<void> {
  await prisma.suggestion.delete({ where: { id } });
}

/** Count suggestions by status for a guild. */
export async function countByGuild(guildId: string): Promise<Record<string, number>> {
  const counts = await prisma.suggestion.groupBy({
    by: ["status"],
    where: { guildId },
    _count: { status: true },
  });
  const result: Record<string, number> = { open: 0, accepted: 0, rejected: 0, implemented: 0 };
  for (const c of counts) {
    result[c.status] = c._count.status;
  }
  return result;
}

/** Namespace export for test compatibility. */
export const suggestionRepository = {
  create,
  findById,
  findByGuild,
  toggleVote,
  getUserVote,
  updateStatus,
  deleteSuggestion,
  countByGuild,
};