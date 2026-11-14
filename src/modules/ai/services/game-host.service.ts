/**
 * Interactive AI Game Host Service for NEXUS AI.
 * Hosts dynamic AI Trivia challenges, riddles, and scoring with SQLite persistence.
 */

import { prisma } from "../../../database/index.js";
import { aiOrchestrator } from "./ai-orchestrator.service.js";
import { createModuleLogger } from "../../../utils/logger.js";

const logger = createModuleLogger("service:game-host");

export interface TriviaQuestion {
  question: string;
  options: string[]; // 4 options
  correctIndex: number; // 0 - 3
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

export class GameHostService {
  private readonly defaultTrivia: TriviaQuestion[] = [
    {
      category: "Tech & Gaming",
      question: "Which of the following was the first video game to feature a playable character named 'Mario'?",
      options: ["Super Mario Bros.", "Donkey Kong (1981)", "Mario Bros. (1983)", "Pac-Man"],
      correctIndex: 1,
      correctAnswer: "Donkey Kong (1981)",
      explanation: "Mario originally debuted as 'Jumpman' in the 1981 arcade hit Donkey Kong!",
      difficulty: "medium",
      pointsAwarded: 50,
    },
    {
      category: "Tech & Gaming",
      question: "What year was the Discord platform officially launched to the public?",
      options: ["2013", "2015", "2017", "2019"],
      correctIndex: 1,
      correctAnswer: "2015",
      explanation: "Discord was released on May 13, 2015, initially designed for competitive PC gamers.",
      difficulty: "easy",
      pointsAwarded: 25,
    },
    {
      category: "Science & Nature",
      question: "What is the most abundant chemical element in the known universe?",
      options: ["Oxygen", "Carbon", "Helium", "Hydrogen"],
      correctIndex: 3,
      correctAnswer: "Hydrogen",
      explanation: "Hydrogen accounts for roughly 75% of all normal matter in the cosmos!",
      difficulty: "easy",
      pointsAwarded: 25,
    },
    {
      category: "Anime & Pop Culture",
      question: "In 'One Piece', what is the name of Luffy's signature straw hat that was originally given to him by Shanks?",
      options: ["The Sun Hat", "Shanks' Legacy", "The Straw Hat", "Roger's Crown"],
      correctIndex: 2,
      correctAnswer: "The Straw Hat",
      explanation: "Gol D. Roger passed the straw hat to Shanks, who in turn entrusted it to Monkey D. Luffy!",
      difficulty: "easy",
      pointsAwarded: 25,
    },
    {
      category: "Tech & Gaming",
      question: "What does the 'WAL' acronym stand for in database architectures like SQLite?",
      options: ["Wide Area Link", "Write-Ahead Logging", "Weighted Access Lock", "Worker Allocation List"],
      correctIndex: 1,
      correctAnswer: "Write-Ahead Logging",
      explanation: "Write-Ahead Logging (WAL) provides superior concurrency by allowing readers while a write occurs!",
      difficulty: "hard",
      pointsAwarded: 100,
    },
  ];

  private readonly defaultRiddles: Riddle[] = [
    {
      riddle: "I speak without a mouth and hear without ears. I have no body, but I come alive with wind. What am I?",
      answer: "echo",
      hint: "Think about sound in a canyon or empty cave.",
      difficulty: "easy",
      pointsAwarded: 50,
    },
    {
      riddle: "I have cities, but no houses. I have mountains, but no trees. I have water, but no fish. What am I?",
      answer: "map",
      hint: "Navigators use me on voyages.",
      difficulty: "medium",
      pointsAwarded: 75,
    },
    {
      riddle: "The more of this there is, the less you see. What is it?",
      answer: "darkness",
      hint: "Turn on the lights to make it vanish.",
      difficulty: "easy",
      pointsAwarded: 50,
    },
  ];

  /**
   * Generates or fetches a trivia question.
   */
  async generateTrivia(
    guildId: string,
    category: string = "Tech & Gaming",
    difficulty: "easy" | "medium" | "hard" = "medium",
  ): Promise<TriviaQuestion> {
    try {
      const prompt = `Generate a single multiple-choice trivia question for Discord.
Category: ${category}
Difficulty: ${difficulty}
Output format in strict JSON:
{
  "question": "Question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctIndex": 0,
  "explanation": "Brief 1-sentence explanation"
}`;

      const aiRes = await aiOrchestrator.generate(guildId, "system", prompt, { mode: "creative" });
      const match = aiRes.content.match(/\{[\s\S]*\}/);

      if (match) {
        const parsed = JSON.parse(match[0]);
        if (Array.isArray(parsed.options) && parsed.options.length === 4 && typeof parsed.correctIndex === "number") {
          const points = difficulty === "easy" ? 25 : difficulty === "hard" ? 100 : 50;
          return {
            category,
            difficulty,
            question: parsed.question,
            options: parsed.options,
            correctIndex: parsed.correctIndex,
            correctAnswer: parsed.options[parsed.correctIndex],
            explanation: parsed.explanation || "",
            pointsAwarded: points,
          };
        }
      }
    } catch (err) {
      logger.debug({ err }, "Using curated trivia fallback");
    }

    // Curated bank fallback
    const filtered = this.defaultTrivia.filter((t) => t.difficulty === difficulty);
    const pool = filtered.length > 0 ? filtered : this.defaultTrivia;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  /**
   * Starts a new trivia round in a Discord channel.
   */
  async startTriviaSession(
    guildId: string,
    channelId: string,
    category: string = "Tech & Gaming",
    difficulty: "easy" | "medium" | "hard" = "medium",
  ) {
    // Expire any existing active sessions in this channel
    await prisma.gameSession.updateMany({
      where: { guildId, channelId, status: "active" },
      data: { status: "expired" },
    });

    const trivia = await this.generateTrivia(guildId, category, difficulty);
    const expiresAt = new Date(Date.now() + 60 * 1000); // 60s answer window

    const session = await prisma.gameSession.create({
      data: {
        guildId,
        channelId,
        gameType: "trivia",
        question: trivia.question,
        correctAnswer: trivia.correctAnswer,
        options: JSON.stringify(trivia.options),
        difficulty: trivia.difficulty,
        pointsAwarded: trivia.pointsAwarded,
        status: "active",
        expiresAt,
      },
    });

    logger.info({ guildId, channelId, sessionId: session.id }, "Started trivia session");
    return { session, trivia };
  }

  /**
   * Starts a new riddle session in a Discord channel.
   */
  async startRiddleSession(
    guildId: string,
    channelId: string,
    difficulty: "easy" | "medium" | "hard" = "medium",
  ) {
    await prisma.gameSession.updateMany({
      where: { guildId, channelId, status: "active" },
      data: { status: "expired" },
    });

    const pool = this.defaultRiddles.filter((r) => r.difficulty === difficulty);
    const selectedPool = pool.length > 0 ? pool : this.defaultRiddles;
    const riddle = selectedPool[Math.floor(Math.random() * selectedPool.length)];
    const expiresAt = new Date(Date.now() + 120 * 1000); // 120s for riddles

    const session = await prisma.gameSession.create({
      data: {
        guildId,
        channelId,
        gameType: "riddle",
        question: riddle.riddle,
        correctAnswer: riddle.answer.toLowerCase(),
        options: JSON.stringify([riddle.hint]),
        difficulty: riddle.difficulty,
        pointsAwarded: riddle.pointsAwarded,
        status: "active",
        expiresAt,
      },
    });

    return { session, riddle };
  }

  /**
   * Evaluates an answer submission for the active game session in a channel.
   */
  async submitAnswer(
    guildId: string,
    channelId: string,
    userId: string,
    username: string,
    submittedAnswer: string,
  ) {
    const session = await prisma.gameSession.findFirst({
      where: {
        guildId,
        channelId,
        status: "active",
        expiresAt: { gt: new Date() },
      },
    });

    if (!session) {
      return { active: false, reason: "No active game session found in this channel (or time expired)." };
    }

    const cleanInput = submittedAnswer.trim().toLowerCase();
    const cleanCorrect = session.correctAnswer.trim().toLowerCase();

    let isCorrect = cleanInput === cleanCorrect;

    // Check index matching (e.g. "0" or "A" or "Option 1")
    if (!isCorrect && session.gameType === "trivia") {
      try {
        const options: string[] = JSON.parse(session.options);
        const correctIndex = options.findIndex((o) => o.trim().toLowerCase() === cleanCorrect);
        const letter = ["a", "b", "c", "d"][correctIndex];

        if (cleanInput === String(correctIndex) || cleanInput === letter) {
          isCorrect = true;
        }
      } catch {
        // Ignored
      }
    }

    if (isCorrect) {
      // Mark session as completed
      await prisma.gameSession.update({
        where: { id: session.id },
        data: { status: "completed", winnerId: userId },
      });

      // Award XP and coins to the winner
      await prisma.guildMember.upsert({
        where: { guildId_userId: { guildId, userId } },
        create: {
          guildId,
          userId,
          username,
          xp: session.pointsAwarded,
          coins: Math.round(session.pointsAwarded / 2),
        },
        update: {
          xp: { increment: session.pointsAwarded },
          coins: { increment: Math.round(session.pointsAwarded / 2) },
        },
      });

      logger.info({ guildId, channelId, userId, points: session.pointsAwarded }, "Game session won");

      return {
        active: true,
        correct: true,
        session,
        correctAnswer: session.correctAnswer,
        pointsAwarded: session.pointsAwarded,
      };
    }

    return {
      active: true,
      correct: false,
      session,
      hint: session.gameType === "riddle" ? JSON.parse(session.options)[0] : undefined,
    };
  }

  /**
   * Retrieves top game winners across the server.
   */
  async getGameLeaderboard(guildId: string, limit: number = 10) {
    const winners = await prisma.gameSession.groupBy({
      by: ["winnerId"],
      where: { guildId, status: "completed", winnerId: { not: null } },
      _count: { _all: true },
      _sum: { pointsAwarded: true },
      orderBy: { _count: { winnerId: "desc" } },
      take: limit,
    });

    return winners;
  }
}

export const gameHostService = new GameHostService();
