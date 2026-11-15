/**
 * Automated Verification Suite for NEXUS AI — Phase 2.
 * Tests Member Engagement Engine, Leveling & XP Curves, Daily Streaks,
 * Achievement Milestones, Birthday Registry, Suggestions, and Polls.
 */

import "dotenv/config";
import { config } from "../src/config/index.js";
import { connectDatabase, disconnectDatabase, memberRepository, prisma } from "../src/database/index.js";
import { levelService } from "../src/modules/engagement/services/level.service.js";
import { streakService } from "../src/modules/engagement/services/streak.service.js";
import { achievementService, BADGE_REGISTRY } from "../src/modules/engagement/services/achievement.service.js";
import { birthdayService } from "../src/modules/engagement/services/birthday.service.js";
import { suggestionRepository } from "../src/modules/engagement/repositories/suggestion.repository.js";
import { pollRepository } from "../src/modules/engagement/repositories/poll.repository.js";
import { engagementModule } from "../src/modules/engagement/index.js";

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
  console.log("⚡ NEXUS AI — Phase 2 Automated Test Suite");
  console.log("====================================================\n");

  // ── 1. Leveling & XP Service ─────────────────────────────
  console.log("1. Testing Leveling & XP Progression Engine:");
  const p0 = levelService.calculateProgress(0);
  assert(p0.level === 0 && p0.currentLevelXp === 0, "0 XP evaluates to Level 0");

  const p100 = levelService.calculateProgress(100);
  assert(p100.level === 1 && p100.currentLevelXp === 0, "100 XP advances to Level 1");

  const pHigh = levelService.calculateProgress(5000);
  assert(pHigh.level > 1 && pHigh.progressPercent >= 0 && pHigh.progressPercent <= 100, "5,000 XP correctly computes higher level");

  const bar = levelService.renderProgressBar(50, 10);
  assert(bar.includes("50%"), "Progress bar displays percentage correctly");

  const uId = "test-user-spam-check";
  const firstMsg = levelService.canEarnMessageXp(uId);
  const secondMsg = levelService.canEarnMessageXp(uId);
  assert(firstMsg === true, "1st message in window awards XP");
  assert(secondMsg === false, "Immediate 2nd message blocked by anti-spam cooldown");

  const randomXp = levelService.getRandomMessageXp();
  assert(randomXp >= 15 && randomXp <= 25, "Random XP is within 15-25 range");

  // ── 2. Daily Rewards & Streak Service ─────────────────────
  console.log("\n2. Testing Daily Rewards & Streak Engine:");
  const claim1 = streakService.calculateClaim(null, 0);
  assert(claim1.success && claim1.newStreak === 1 && claim1.xpEarned === 120, "First claim starts at Streak 1 with base rewards");

  const recentDate = new Date();
  const claimBlocked = streakService.calculateClaim(recentDate, 1);
  assert(!claimBlocked.success && (claimBlocked.cooldownRemainingMs || 0) > 0, "Claim within 24h rejected with cooldown");

  const yesterdayDate = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25 hours ago
  const claimStreak2 = streakService.calculateClaim(yesterdayDate, 1);
  assert(claimStreak2.success && claimStreak2.newStreak === 2, "Claim after 25h increments streak to 2");

  const expiredDate = new Date(Date.now() - 50 * 60 * 60 * 1000); // 50 hours ago
  const claimReset = streakService.calculateClaim(expiredDate, 5);
  assert(claimReset.success && claimReset.newStreak === 1, "Claim after 50h resets streak to 1");

  // ── 3. Achievement & Badge System ────────────────────────
  console.log("\n3. Testing Achievement & Badge System:");
  assert(Object.keys(BADGE_REGISTRY).length >= 10, "At least 10 badges registered");

  const eval1 = achievementService.evaluateBadges("[]", {
    messageCount: 1,
    level: 0,
    dailyStreak: 0,
    reputation: 0,
    voiceMinutes: 0,
    hasBirthday: false,
    hasBio: false,
  });
  assert(eval1.newlyUnlocked.some((b) => b.id === "first_words"), "'first_words' badge awarded on 1st message");

  const eval2 = achievementService.evaluateBadges(JSON.stringify(["first_words"]), {
    messageCount: 50,
    level: 5,
    dailyStreak: 3,
    reputation: 5,
    voiceMinutes: 35,
    hasBirthday: true,
    hasBio: true,
  });
  assert(eval2.newlyUnlocked.some((b) => b.id === "level_5"), "Level 5 badge unlocked");
  assert(eval2.newlyUnlocked.some((b) => b.id === "streak_3"), "Streak 3 badge unlocked");
  assert(eval2.newlyUnlocked.some((b) => b.id === "helpful_5"), "Helpful 5 badge unlocked");
  assert(eval2.newlyUnlocked.some((b) => b.id === "voice_30m"), "Voice 30m badge unlocked");
  assert(!eval2.newlyUnlocked.some((b) => b.id === "first_words"), "Already unlocked badge not re-awarded");

  // ── 4. Birthday Engine ───────────────────────────────────
  console.log("\n4. Testing Birthday Tracking Engine:");
  assert(birthdayService.isValidBirthday("05-24"), "Valid '05-24' accepted");
  assert(birthdayService.isValidBirthday("12-31"), "Valid '12-31' accepted");
  assert(!birthdayService.isValidBirthday("13-01"), "Invalid month 13 rejected");
  assert(!birthdayService.isValidBirthday("02-31"), "Invalid Feb 31 rejected");
  assert(!birthdayService.isValidBirthday("abc"), "Invalid format rejected");

  const todayStr = birthdayService.getTodayString("UTC");
  assert(/^\d{2}-\d{2}$/.test(todayStr), "Today string formatted as MM-DD");

  // ── 5. Database Repositories (Suggestions & Polls) ───────
  console.log("\n5. Testing Engagement Repositories:");

  // Check if PostgreSQL is available
  const isPostgres =
    typeof config.database.url === "string" &&
    (config.database.url.startsWith("postgresql://") ||
      config.database.url.startsWith("postgres://"));

  if (!isPostgres) {
    console.log(
      "  ⚠ [SKIP] Database repository tests require a PostgreSQL DATABASE_URL.",
    );
    console.log(
      "     Set DATABASE_URL to a postgresql:// connection string, start PostgreSQL,",
    );
    console.log(
      "     run `npm run db:push`, then re-run: npx tsx tests/phase2.test.ts",
    );
  } else {
    await connectDatabase();

    const testGuildId = "888777666555444333";
    const testUserId = "222333444555666777";

  // Create test guild record
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "Engagement Test Server", ownerId: testUserId },
  });

  // Suggestion Test
  const suggestion = await suggestionRepository.create({
    guildId: testGuildId,
    userId: testUserId,
    username: "TestSuggester",
    content: "Add a community trivia night!",
  });
  assert(suggestion.content === "Add a community trivia night!", "Suggestion record created");

  const voteResult1 = await suggestionRepository.toggleVote(suggestion.id, "voter-1", "upvote");
  assert(voteResult1.upvoteCount === 1 && voteResult1.downvoteCount === 0, "Upvote recorded on suggestion");

  const voteResult2 = await suggestionRepository.toggleVote(suggestion.id, "voter-1", "downvote");
  assert(voteResult2.upvoteCount === 0 && voteResult2.downvoteCount === 1, "Vote switched to downvote");

  const voteResult3 = await suggestionRepository.toggleVote(suggestion.id, "voter-1", "downvote");
  assert(voteResult3.downvoteCount === 0, "Downvote toggled off");

  // Poll Test
  const poll = await pollRepository.create({
    guildId: testGuildId,
    creatorId: testUserId,
    channelId: "channel-123",
    question: "Which game should we play this weekend?",
    options: ["Valorant", "Minecraft", "Among Us"],
  });
  assert(poll.question.includes("weekend"), "Poll record created");

  const pollVote1 = await pollRepository.recordVote(poll.id, "player-1", 0);
  assert(pollVote1.tally[0] === 1 && pollVote1.totalVotes === 1, "Poll vote for Option 0 recorded");

  const pollVote2 = await pollRepository.recordVote(poll.id, "player-2", 1);
  assert(pollVote2.tally[1] === 1 && pollVote2.totalVotes === 2, "Poll vote for Option 1 recorded");

  // Member Rep & Daily Updates
  await memberRepository.findOrCreate(testGuildId, testUserId, "TestUser");
  await memberRepository.update(testGuildId, testUserId, {
    dailyStreak: 3,
    reputation: 5,
    birthday: "08-15",
    bio: "Passionate gamer and builder.",
  });
  const updatedM = await memberRepository.findByGuildAndUser(testGuildId, testUserId);
      assert(updatedM?.dailyStreak === 3 && updatedM?.reputation === 5 && updatedM?.birthday === "08-15", "Member engagement fields updated");

      // ── 6. Engagement Module Structure ───────────────────────
      console.log("\n6. Testing Engagement Module Definition:");
      assert(engagementModule.name === "engagement", "Module name is 'engagement'");
      assert(engagementModule.commands.length === 11, `Module exports 11 slash commands (found ${engagementModule.commands.length})`);
      assert(engagementModule.events.length === 2, "Module exports 2 events (guildMemberAdd, messageCreate)");

      const health = await engagementModule.healthCheck();
      assert(health.status === "healthy", "Engagement module health check passed");

      await disconnectDatabase();
    }

    // ── Summary ──────────────────────────────────────────────
  console.log("\n====================================================");
  console.log(`Phase 2 Tests Finished: ${passedTests} passed, ${failedTests} failed.`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
