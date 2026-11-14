/**
 * Suggestion repository for NEXUS AI.
 */
import { prisma } from "../../../database/index.js";
export class SuggestionRepository {
    async create(data) {
        return prisma.suggestion.create({
            data: {
                guildId: data.guildId,
                userId: data.userId,
                username: data.username,
                content: data.content,
                channelId: data.channelId,
                messageId: data.messageId,
            },
        });
    }
    async findById(id) {
        return prisma.suggestion.findUnique({ where: { id } });
    }
    async findByMessageId(messageId) {
        return prisma.suggestion.findFirst({ where: { messageId } });
    }
    async update(id, data) {
        return prisma.suggestion.update({
            where: { id },
            data,
        });
    }
    async toggleVote(id, userId, type) {
        const record = await this.findById(id);
        if (!record)
            throw new Error("Suggestion not found");
        let upvotes = JSON.parse(record.upvotes || "[]");
        let downvotes = JSON.parse(record.downvotes || "[]");
        if (type === "upvote") {
            // Remove from downvotes if present
            downvotes = downvotes.filter((u) => u !== userId);
            // Toggle upvote
            if (upvotes.includes(userId)) {
                upvotes = upvotes.filter((u) => u !== userId);
            }
            else {
                upvotes.push(userId);
            }
        }
        else {
            // Remove from upvotes if present
            upvotes = upvotes.filter((u) => u !== userId);
            // Toggle downvote
            if (downvotes.includes(userId)) {
                downvotes = downvotes.filter((u) => u !== userId);
            }
            else {
                downvotes.push(userId);
            }
        }
        const updated = await prisma.suggestion.update({
            where: { id },
            data: {
                upvotes: JSON.stringify(upvotes),
                downvotes: JSON.stringify(downvotes),
            },
        });
        return {
            suggestion: updated,
            upvoteCount: upvotes.length,
            downvoteCount: downvotes.length,
        };
    }
    async getRecent(guildId, limit = 10) {
        return prisma.suggestion.findMany({
            where: { guildId },
            orderBy: { createdAt: "desc" },
            take: limit,
        });
    }
}
export const suggestionRepository = new SuggestionRepository();
//# sourceMappingURL=suggestion.repository.js.map