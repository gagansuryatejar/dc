/**
 * Automated Verification Suite for NEXUS AI — Phase 8.
 * Tests Experimental AI Features:
 * 1. Community Pulse Subsystem (Sentiment, mood analysis, topic extraction, caching)
 * 2. Smart Voice Companion Subsystem (Voice icebreakers, discussion recaps, announcements)
 * 3. Community Memory & Server Lore (SQLite persistence, quotes, milestones, upvotes, permissions)
 * 4. Interactive AI Game Host (Trivia generation, riddles, interactive answering, XP rewards, leaderboard)
 * 5. Module & Command Registration (Slash commands, event listeners, health checks)
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase, prisma } from "../src/database/index.js";
import { communityPulseService } from "../src/modules/ai/services/community-pulse.service.js";
import { voiceCompanionService } from "../src/modules/ai/services/voice-companion.service.js";
import { communityLoreService } from "../src/modules/ai/services/community-lore.service.js";
import { gameHostService } from "../src/modules/ai/services/game-host.service.js";
import { aiModule } from "../src/modules/ai/index.js";
import { pulseCommand } from "../src/modules/ai/commands/pulse.js";
import { companionCommand } from "../src/modules/ai/commands/companion.js";
import { loreCommand } from "../src/modules/ai/commands/lore.js";
import { gameCommand } from "../src/modules/ai/commands/game.js";

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`  ✖ [FAIL] ${testName}${details ? ` — ${details}` : ""}`);
    failedTests++;
  }
}

async function runSuite(): Promise<void> {
  console.log("\n====================================================");
  console.log("⚡ NEXUS AI — Phase 8 Automated Test Suite");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "888111222333444555";
  const channelId = "999000111222333444";
  const user1 = "8001";
  const user2 = "8002";

  // Clean previous test state
  await prisma.serverLore.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.gameSession.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "Experimental AI Test Guild", ownerId: user1 },
  });

  await prisma.guildMember.createMany({
    data: [
      { guildId: testGuildId, userId: user1, username: "LoreMaster", xp: 100, coins: 50 },
      { guildId: testGuildId, userId: user2, username: "TriviaKing", xp: 200, coins: 100 },
    ],
  });

  // ── TEST GROUP 1: Community Pulse Subsystem ───────────────
  console.log("▶ Group 1: Community Pulse & Sentiment Analysis");

  const enthusiasticSample = [
    "OMG this new update is awesome and so much fun!!",
    "I love the voice rooms and the gaming event last night was great!",
    "Hype for the weekend stream, cool features everyone!",
    "Thanks for setting this up, best Discord bot ever haha",
  ];

  const pulseEnthusiastic = await communityPulseService.analyzePulse(
    testGuildId,
    enthusiasticSample,
    true,
  );

  assert(
    pulseEnthusiastic.sentimentScore > 0,
    `Pulse Sentiment: Positive/enthusiastic sentiment score computed (+${pulseEnthusiastic.sentimentScore})`,
  );
  assert(
    pulseEnthusiastic.sentimentLabel === "Enthusiastic" || pulseEnthusiastic.sentimentLabel === "Positive",
    `Pulse Label: Sentiment accurately classified as '${pulseEnthusiastic.sentimentLabel}'`,
  );
  assert(
    pulseEnthusiastic.sampleSize === 4,
    "Pulse Sample: Analyzed sample size accurately recorded (4 messages)",
  );
  assert(
    pulseEnthusiastic.trendingTopics.length > 0,
    `Pulse Topics: Extracted trending keywords (${pulseEnthusiastic.trendingTopics.join(", ")})`,
  );

  // Inquisitive sample
  const inquisitiveSample = [
    "How do we configure the voice channels?",
    "Why is the stream starting late?",
    "What are the server rules for advertising?",
    "Who is hosting the next gaming party?",
  ];

  const pulseInquisitive = await communityPulseService.analyzePulse(
    testGuildId,
    inquisitiveSample,
    true,
  );

  assert(
    pulseInquisitive.sentimentLabel === "Constructive" || pulseInquisitive.sentimentLabel === "Neutral",
    `Pulse Inquisitive: Inquisitive discussion identified as '${pulseInquisitive.sentimentLabel}'`,
  );

  // Default empty sample
  const pulseEmpty = await communityPulseService.analyzePulse(testGuildId, [], true);
  assert(
    pulseEmpty.engagementHealth === "quiet",
    "Pulse Empty: Empty channel sample classified as 'quiet' health",
  );

  // Cache verification
  const pulseCached = await communityPulseService.analyzePulse(testGuildId, inquisitiveSample, false);
  assert(
    pulseCached.analyzedAt === pulseEmpty.analyzedAt,
    "Pulse Cache: In-memory 5-minute TTL cache returns stored analysis",
  );

  // ── TEST GROUP 2: Smart Voice Companion Subsystem ────────
  console.log("\n▶ Group 2: Smart Voice Companion Subsystem");

  const icebreakerGaming = await voiceCompanionService.generateIcebreaker(testGuildId, "gaming");
  assert(
    icebreakerGaming.category === "gaming" && icebreakerGaming.question.length > 10,
    "Voice Icebreaker: Generated gaming icebreaker question",
  );
  assert(
    icebreakerGaming.followUp.length > 5,
    "Voice Icebreaker: Generated conversational follow-up spark",
  );

  const icebreakerGeneral = await voiceCompanionService.generateIcebreaker(testGuildId, "general");
  assert(
    icebreakerGeneral.question.length > 10,
    "Voice Icebreaker: Generated general conversation starter",
  );

  // Discussion recap
  const notes = [
    "Discussed launching weekly Minecraft game nights",
    "Decided on Friday 8 PM EST for community watch parties",
    "Assigned TriviaKing to moderate the voice lounge",
  ];

  const recap = await voiceCompanionService.generateMeetingRecap(testGuildId, "General Voice", notes);
  assert(
    recap.channelName === "General Voice",
    "Voice Recap: Voice channel name preserved in recap",
  );
  assert(
    recap.topicsDiscussed.length > 0,
    `Voice Recap: Structured topics extracted (${recap.topicsDiscussed.length} topics)`,
  );
  assert(
    recap.keyTakeaways.length > 0 && recap.actionItems.length > 0,
    "Voice Recap: Generated key takeaways and actionable follow-up items",
  );

  // Spoken announcement script
  const announcementScript = await voiceCompanionService.generateVoiceAnnouncement(
    testGuildId,
    "Tournament Finals",
    "Top 4 teams battle in voice lounge 1",
  );
  assert(
    announcementScript.length > 20 && announcementScript.includes("Tournament"),
    "Voice Announcement: Generated spoken-style announcement script",
  );

  // ── TEST GROUP 3: Community Memory & Server Lore ─────────
  console.log("\n▶ Group 3: Community Memory & Server Lore");

  // Add lore entry
  const lore1 = await communityLoreService.addLore(testGuildId, {
    topic: "Raid Night Victory 2026",
    content: "The epic 4-hour boss fight where LoreMaster survived with 1 HP and clutched the win!",
    submittedBy: user1,
    submitterTag: "LoreMaster",
    category: "milestone",
  });

  assert(
    lore1.topic === "raid_night_victory_2026",
    "Lore Normalization: Topic normalized to lowercase underscore slug",
  );
  assert(
    lore1.category === "milestone",
    "Lore Categorization: Category persisted as 'milestone'",
  );

  // Add quote
  const quote1 = await communityLoreService.addLore(testGuildId, {
    topic: "TriviaKing Famous Quote",
    content: "Trust me guys, I know the answer with 100% certainty (proceeds to get it wrong).",
    submittedBy: user2,
    submitterTag: "TriviaKing",
    category: "quote",
  });

  assert(
    quote1.id !== lore1.id,
    "Lore Persistence: Multiple distinct lore entries stored in SQLite",
  );

  // Retrieve lore by exact topic
  const retrievedExact = await communityLoreService.getLore(testGuildId, "raid_night_victory_2026");
  assert(
    retrievedExact !== null && retrievedExact.id === lore1.id,
    "Lore Retrieval: Retrieved lore entry via exact topic match",
  );

  // Retrieve lore by keyword
  const retrievedKeyword = await communityLoreService.getLore(testGuildId, "boss fight");
  assert(
    retrievedKeyword !== null && retrievedKeyword.id === lore1.id,
    "Lore Search: Found lore entry via keyword substring search in content",
  );

  // Upvote lore
  const upvoted = await communityLoreService.upvoteLore(testGuildId, lore1.id);
  assert(upvoted.upvotes === 1, "Lore Upvotes: Upvote incremented count to 1");

  // List lore
  const allLore = await communityLoreService.listLore(testGuildId);
  assert(allLore.length === 2, `Lore List: Retrieved ${allLore.length} entries for guild`);

  const quotesOnly = await communityLoreService.listLore(testGuildId, "quote");
  assert(
    quotesOnly.length === 1 && quotesOnly[0]?.category === "quote",
    "Lore Filtering: Successfully filtered list by 'quote' category",
  );

  // Random lore
  const randomEntry = await communityLoreService.getRandomLore(testGuildId);
  assert(randomEntry !== null, "Lore Randomizer: Returned random entry from server lore archives");

  // Delete permissions
  const unauthDelete = await communityLoreService.deleteLore(
    testGuildId,
    "raid_night_victory_2026",
    user2, // user2 didn't create lore1
    false, // not admin
  );
  assert(
    unauthDelete.success === false,
    "Lore Security: Non-creator non-admin blocked from deleting lore entry",
  );

  const authDelete = await communityLoreService.deleteLore(
    testGuildId,
    "raid_night_victory_2026",
    user1,
    false,
  );
  assert(authDelete.success === true, "Lore Deletion: Author successfully deleted their lore entry");

  const checkDeleted = await communityLoreService.getLore(testGuildId, "raid_night_victory_2026");
  assert(checkDeleted === null, "Lore Deletion Verified: Deleted entry no longer exists in database");

  // ── TEST GROUP 4: Interactive AI Game Host ────────────────
  console.log("\n▶ Group 4: Interactive AI Game Host (Trivia & Riddles)");

  // Start trivia session
  const { session: triviaSession, trivia } = await gameHostService.startTriviaSession(
    testGuildId,
    channelId,
    "Tech & Gaming",
    "medium",
  );

  assert(
    triviaSession.status === "active" && triviaSession.gameType === "trivia",
    "Trivia Session: Created active trivia session in SQLite",
  );
  assert(
    trivia.options.length === 4,
    "Trivia Question: Generated question with exactly 4 distinct choices",
  );
  assert(
    trivia.correctAnswer.length > 0,
    `Trivia Answer: Answer defined ('${trivia.correctAnswer}')`,
  );
  assert(
    trivia.pointsAwarded === 50,
    "Trivia Points: Medium difficulty awards 50 points",
  );

  // Incorrect answer submission
  const wrongAns = await gameHostService.submitAnswer(
    testGuildId,
    channelId,
    user1,
    "LoreMaster",
    "Totally Wrong Answer That Cannot Match",
  );

  assert(
    wrongAns.active === true && wrongAns.correct === false,
    "Trivia Submission: Incorrect answer submission flagged as incorrect",
  );

  // Correct answer submission
  const correctAns = await gameHostService.submitAnswer(
    testGuildId,
    channelId,
    user2,
    "TriviaKing",
    trivia.correctAnswer,
  );

  assert(
    correctAns.active === true && correctAns.correct === true,
    "Trivia Submission: Correct answer submission verified and accepted",
  );
  assert(
    correctAns.pointsAwarded === 50,
    "Trivia Rewards: Awarded 50 points to winning user",
  );

  // Verify XP and Coins awarded to User 2
  const updatedUser2 = await prisma.guildMember.findUnique({
    where: { guildId_userId: { guildId: testGuildId, userId: user2 } },
  });
  assert(
    updatedUser2?.xp === 250 && updatedUser2?.coins === 125,
    "Trivia Economy: XP (+50) and Coins (+25) credited to winner profile in database",
  );

  // Verify session is now completed
  const completedSession = await prisma.gameSession.findUnique({
    where: { id: triviaSession.id },
  });
  assert(
    completedSession?.status === "completed" && completedSession?.winnerId === user2,
    "Trivia Session State: Session marked 'completed' with winnerId recorded",
  );

  // Attempt answering completed session
  const lateAttempt = await gameHostService.submitAnswer(
    testGuildId,
    channelId,
    user1,
    "LoreMaster",
    trivia.correctAnswer,
  );
  assert(
    lateAttempt.active === false,
    "Trivia Guard: Late attempt rejected because session is no longer active",
  );

  // Riddle session
  const { session: riddleSession, riddle } = await gameHostService.startRiddleSession(
    testGuildId,
    channelId,
    "easy",
  );
  assert(
    riddleSession.status === "active" && riddleSession.gameType === "riddle",
    "Riddle Session: Created active riddle session",
  );
  assert(riddle.hint.length > 5, "Riddle Hint: Riddle includes helpful hint");

  // Correct riddle answer
  const riddleCorrect = await gameHostService.submitAnswer(
    testGuildId,
    channelId,
    user1,
    "LoreMaster",
    riddle.answer,
  );
  assert(
    riddleCorrect.correct === true,
    `Riddle Evaluation: Correctly matched riddle solution ('${riddle.answer}')`,
  );

  // Game leaderboard
  const leaderboard = await gameHostService.getGameLeaderboard(testGuildId, 5);
  assert(
    leaderboard.length >= 2,
    `Game Leaderboard: Generated champions ranking (${leaderboard.length} winners tracked)`,
  );

  // ── TEST GROUP 5: Module & Command Registration ───────────
  console.log("\n▶ Group 5: Module & Command Registration");

  assert(
    aiModule.commands.includes(pulseCommand),
    "AI Module: Registered /pulse command",
  );
  assert(
    aiModule.commands.includes(companionCommand),
    "AI Module: Registered /companion command",
  );
  assert(
    aiModule.commands.includes(loreCommand),
    "AI Module: Registered /lore command",
  );
  assert(
    aiModule.commands.includes(gameCommand),
    "AI Module: Registered /game command",
  );

  const companionSubcommands = (companionCommand.data as any).options.map((o: any) => o.name);
  assert(
    companionSubcommands.includes("icebreaker") &&
      companionSubcommands.includes("recap") &&
      companionSubcommands.includes("announce"),
    "Companion Subcommands: All 3 subcommands (icebreaker, recap, announce) registered",
  );

  const loreSubcommands = (loreCommand.data as any).options.map((o: any) => o.name);
  assert(
    loreSubcommands.includes("add") &&
      loreSubcommands.includes("recall") &&
      loreSubcommands.includes("random") &&
      loreSubcommands.includes("list") &&
      loreSubcommands.includes("delete"),
    "Lore Subcommands: All 5 subcommands (add, recall, random, list, delete) registered",
  );

  const gameSubcommands = (gameCommand.data as any).options.map((o: any) => o.name);
  assert(
    gameSubcommands.includes("trivia") &&
      gameSubcommands.includes("riddle") &&
      gameSubcommands.includes("answer") &&
      gameSubcommands.includes("leaderboard"),
    "Game Subcommands: All 4 subcommands (trivia, riddle, answer, leaderboard) registered",
  );

  const health = await aiModule.healthCheck();
  assert(health.status === "healthy", "AI Module Health: Health check operational");

  // Cleanup test records
  await prisma.serverLore.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.gameSession.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.delete({ where: { id: testGuildId } }).catch(() => null);

  await disconnectDatabase();

  console.log("\n====================================================");
  console.log(`Results: ${passedTests} passed, ${failedTests} failed`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
