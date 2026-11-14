/**
 * Poll repository for NEXUS AI.
 */
import { prisma } from "../../../database/index.js";
export class PollRepository {
    async create(data) {
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
    async findById(id) {
        return prisma.poll.findUnique({ where: { id } });
    }
    async findByMessageId(messageId) {
        return prisma.poll.findFirst({ where: { messageId } });
    }
    async update(id, data) {
        return prisma.poll.update({
            where: { id },
            data,
        });
    }
    async recordVote(pollId, userId, optionIndex) {
        const poll = await this.findById(pollId);
        if (!poll)
            throw new Error("Poll not found");
        const votesMap = JSON.parse(poll.votes || "{}");
        votesMap[userId] = optionIndex;
        const updated = await prisma.poll.update({
            where: { id: pollId },
            data: { votes: JSON.stringify(votesMap) },
        });
        const tally = {};
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
//# sourceMappingURL=poll.repository.js.map