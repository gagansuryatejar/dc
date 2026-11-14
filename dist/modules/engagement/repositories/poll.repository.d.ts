/**
 * Poll repository for NEXUS AI.
 */
import { type Poll } from "@prisma/client";
export declare class PollRepository {
    create(data: {
        guildId: string;
        creatorId: string;
        channelId: string;
        messageId?: string;
        question: string;
        options: string[];
        expiresAt?: Date;
    }): Promise<Poll>;
    findById(id: string): Promise<Poll | null>;
    findByMessageId(messageId: string): Promise<Poll | null>;
    update(id: string, data: Partial<Poll>): Promise<Poll>;
    recordVote(pollId: string, userId: string, optionIndex: number): Promise<{
        poll: Poll;
        tally: Record<number, number>;
        totalVotes: number;
    }>;
}
export declare const pollRepository: PollRepository;
