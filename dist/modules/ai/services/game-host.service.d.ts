/**
 * Interactive AI Game Host Service for NEXUS AI.
 * Hosts dynamic AI Trivia challenges, riddles, and scoring with SQLite persistence.
 */
export interface TriviaQuestion {
    question: string;
    options: string[];
    correctIndex: number;
    correctAnswer: string;
    explanation: string;
    category: string;
    difficulty: "easy" | "medium" | "hard";
    pointsAwarded: number;
}
export interface Riddle {
    riddle: string;
    answer: string;
    hint: string;
    difficulty: "easy" | "medium" | "hard";
    pointsAwarded: number;
}
export declare class GameHostService {
    private readonly defaultTrivia;
    private readonly defaultRiddles;
    /**
     * Generates or fetches a trivia question.
     */
    generateTrivia(guildId: string, category?: string, difficulty?: "easy" | "medium" | "hard"): Promise<TriviaQuestion>;
    /**
     * Starts a new trivia round in a Discord channel.
     */
    startTriviaSession(guildId: string, channelId: string, category?: string, difficulty?: "easy" | "medium" | "hard"): Promise<{
        session: {
            options: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            guildId: string;
            channelId: string;
            question: string;
            expiresAt: Date;
            gameType: string;
            correctAnswer: string;
            difficulty: string;
            winnerId: string | null;
            pointsAwarded: number;
        };
        trivia: TriviaQuestion;
    }>;
    /**
     * Starts a new riddle session in a Discord channel.
     */
    startRiddleSession(guildId: string, channelId: string, difficulty?: "easy" | "medium" | "hard"): Promise<{
        session: {
            options: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            guildId: string;
            channelId: string;
            question: string;
            expiresAt: Date;
            gameType: string;
            correctAnswer: string;
            difficulty: string;
            winnerId: string | null;
            pointsAwarded: number;
        };
        riddle: Riddle;
    }>;
    /**
     * Evaluates an answer submission for the active game session in a channel.
     */
    submitAnswer(guildId: string, channelId: string, userId: string, username: string, submittedAnswer: string): Promise<{
        active: boolean;
        reason: string;
        correct?: undefined;
        session?: undefined;
        correctAnswer?: undefined;
        pointsAwarded?: undefined;
        hint?: undefined;
    } | {
        active: boolean;
        correct: boolean;
        session: {
            options: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            guildId: string;
            channelId: string;
            question: string;
            expiresAt: Date;
            gameType: string;
            correctAnswer: string;
            difficulty: string;
            winnerId: string | null;
            pointsAwarded: number;
        };
        correctAnswer: string;
        pointsAwarded: number;
        reason?: undefined;
        hint?: undefined;
    } | {
        active: boolean;
        correct: boolean;
        session: {
            options: string;
            status: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            guildId: string;
            channelId: string;
            question: string;
            expiresAt: Date;
            gameType: string;
            correctAnswer: string;
            difficulty: string;
            winnerId: string | null;
            pointsAwarded: number;
        };
        hint: any;
        reason?: undefined;
        correctAnswer?: undefined;
        pointsAwarded?: undefined;
    }>;
    /**
     * Retrieves top game winners across the server.
     */
    getGameLeaderboard(guildId: string, limit?: number): Promise<(import("@prisma/client").Prisma.PickEnumerable<import("@prisma/client").Prisma.GameSessionGroupByOutputType, "winnerId"[]> & {
        _count: {
            _all: number;
        };
        _sum: {
            pointsAwarded: number | null;
        };
    })[]>;
}
export declare const gameHostService: GameHostService;
