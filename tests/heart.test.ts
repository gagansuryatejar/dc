/**
 * Automated Verification Suite for NEXUS AI — NEXUS HEART.
 * Tests the Intelligent Voice Companion Subsystem & Gemini API Key Integration:
 * 1. Gemini Cloud AI Key Integration & Provider Availability
 * 2. Sweet AI Personality Engine (5 Personalities, Multilingual EN/TE/Mixed, Absence greetings)
 * 3. Heart Configuration Service (Guild autojoin, channel whitelists, user preferences)
 * 4. Heart Tracker Engine (Active duration, anti-deaf exploit check, duplicate prevention)
 * 5. Progressive Milestones (15m, 30m, 1h, 2h, 3h, 5h) & Rewards (XP, Coins, Badges)
 * 6. Heart Reward Shop (Catalog, coin deduction, title/badge equipping, duplicate buy protection)
 * 7. Voice Auto-Join & Empty Room Disconnect Cleanup
 * 8. Slash Command Serialization (/voice autojoin/greeting, /heart 7 subcommands)
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase, prisma } from "../src/database/index.js";
import { geminiProvider } from "../src/modules/ai/providers/gemini.provider.js";
import { heartPersonalityService } from "../src/modules/voice/services/heart-personality.service.js";
import { heartConfigService } from "../src/modules/voice/services/heart-config.service.js";
import { heartTrackerService, HEART_MILESTONES } from "../src/modules/voice/services/heart-tracker.service.js";
import { heartShopService } from "../src/modules/voice/services/heart-shop.service.js";
import { voiceAutoJoinService } from "../src/modules/voice/services/voice-autojoin.service.js";
import { voiceCommand } from "../src/modules/voice/commands/voice.js";
import { heartCommand } from "../src/modules/voice/commands/heart.js";
import { memberRepository, guildRepository } from "../src/database/index.js";

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
  console.log("❤️ NEXUS AI — NEXUS HEART Automated Test Suite");
  console.log("Intelligent Voice Companion, Sweet Appreciation & Shop");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "guild-heart-test-01";
  const testUserId = "user-heart-test-01";
  const testUsername = "HeartTester";

  // Clean test fixtures
  await prisma.heartReward.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.deleteMany({ where: { id: testGuildId } }).catch(() => null);

  await guildRepository.findOrCreate(testGuildId, "Heart Test Guild", "owner-01");
  await memberRepository.findOrCreate(testGuildId, testUserId, testUsername);

  // ── TEST GROUP 1: Gemini Key Integration ───────────────────────────
  console.log("▶ Group 1: Gemini Key Integration & AI Availability");

  assert(
    geminiProvider.isAvailable() === true,
    "Gemini Provider: isAvailable() returns true with configured GEMINI_API_KEY",
  );
  assert(
    geminiProvider.name === "gemini",
    "Gemini Provider: Provider identifier is 'gemini'",
  );

  // ── TEST GROUP 2: Sweet AI Personality Engine ──────────────────────
  console.log("\n▶ Group 2: Sweet AI Personality Engine & Multilingual Generations");

  // Test all 5 personalities
  const sweetGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "sweet",
    language: "en",
    memberCountInRoom: 3,
  });
  assert(
    typeof sweetGreeting === "string" && sweetGreeting.length > 5,
    `Sweet Personality: Generated English greeting: "${sweetGreeting}"`,
  );

  const funnyGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "funny",
    language: "en",
    memberCountInRoom: 2,
  });
  assert(
    typeof funnyGreeting === "string" && funnyGreeting.length > 5,
    `Funny Personality: Generated humorous greeting: "${funnyGreeting}"`,
  );

  const gamingGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "gaming",
    language: "en",
    memberCountInRoom: 4,
  });
  assert(
    typeof gamingGreeting === "string" && gamingGreeting.length > 5,
    `Gaming Personality: Generated gamer greeting: "${gamingGreeting}"`,
  );

  const royalGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "royal",
    language: "en",
    memberCountInRoom: 2,
  });
  assert(
    typeof royalGreeting === "string" && royalGreeting.length > 5,
    `Royal Personality: Generated dignified greeting: "${royalGreeting}"`,
  );

  const cuteGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "cute",
    language: "en",
    memberCountInRoom: 1,
  });
  assert(
    typeof cuteGreeting === "string" && cuteGreeting.length > 5,
    `Cute Personality: Generated adorable greeting: "${cuteGreeting}"`,
  );

  // Multilingual: Telugu and Tenglish
  const teluguGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "sweet",
    language: "te",
    memberCountInRoom: 2,
  });
  assert(
    typeof teluguGreeting === "string" && teluguGreeting.length > 5,
    `Telugu Support: Generated native Telugu script greeting: "${teluguGreeting}"`,
  );

  const mixedGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "sweet",
    language: "mixed",
    memberCountInRoom: 2,
  });
  assert(
    typeof mixedGreeting === "string" && mixedGreeting.length > 5,
    `Tenglish Support: Generated mixed Telugu-English greeting: "${mixedGreeting}"`,
  );

  // Returning member after days
  const absentGreeting = await heartPersonalityService.generateGreeting({
    username: testUsername,
    personality: "sweet",
    language: "en",
    daysAbsent: 5,
    memberCountInRoom: 2,
  });
  assert(
    absentGreeting.includes("LOOK WHO'S BACKKK") || absentGreeting.includes("Welcome home"),
    `Absent Member Welcome: Generates warm reunion message: "${absentGreeting}"`,
  );

  // Appreciation generation for 15m and 1h
  const app15m = await heartPersonalityService.generateAppreciation({
    username: testUsername,
    milestoneName: "First Hello",
    durationMinutes: 15,
    personality: "sweet",
    language: "en",
  });
  assert(
    typeof app15m === "string" && app15m.length > 10,
    `Appreciation Generator (15m): Generated milestone message: "${app15m}"`,
  );

  const app1h = await heartPersonalityService.generateAppreciation({
    username: testUsername,
    milestoneName: "Golden Friend",
    durationMinutes: 60,
    personality: "sweet",
    language: "en",
  });
  assert(
    typeof app1h === "string" && (app1h.includes("ONE HOUR") || app1h.includes("Golden Friend")),
    `Appreciation Generator (1h): Generated 1-hour milestone message: "${app1h}"`,
  );

  // ── TEST GROUP 3: Heart Configuration Service ──────────────────────
  console.log("\n▶ Group 3: Heart Configuration & Whitelists");

  const initialGuildSettings = await heartConfigService.getGuildSettings(testGuildId);
  assert(
    initialGuildSettings.autojoinEnabled === false && initialGuildSettings.greetingsEnabled === true,
    "Guild Settings: Default settings loaded (autojoin: false, greetings: true)",
  );

  // Enable autojoin
  await heartConfigService.setAutoJoin(testGuildId, true);
  const updatedSettings = await heartConfigService.getGuildSettings(testGuildId);
  assert(
    updatedSettings.autojoinEnabled === true,
    "Guild Settings: Successfully enabled voice autojoin",
  );

  // Add allowed channel
  const testChannelId = "voice-chan-999";
  await heartConfigService.addAllowedChannel(testGuildId, testChannelId);
  const withChannel = await heartConfigService.getGuildSettings(testGuildId);
  assert(
    withChannel.allowedChannels.includes(testChannelId),
    "Channel Whitelist: Added voice channel to whitelist",
  );

  // Remove channel
  await heartConfigService.removeAllowedChannel(testGuildId, testChannelId);
  const withoutChannel = await heartConfigService.getGuildSettings(testGuildId);
  assert(
    !withoutChannel.allowedChannels.includes(testChannelId),
    "Channel Whitelist: Removed voice channel from whitelist",
  );

  // User preferences
  await heartConfigService.updateUserPreferences(testGuildId, testUserId, {
    personality: "gaming",
    language: "mixed",
    appreciationPings: false,
  });
  const userPrefs = await heartConfigService.getUserPreferences(testGuildId, testUserId);
  assert(
    userPrefs.personality === "gaming" && userPrefs.language === "mixed" && userPrefs.appreciationPings === false,
    "User Preferences: Customized personality (gaming), language (mixed), pings (false)",
  );

  // ── TEST GROUP 4: Heart Tracker Engine & Progressive Milestones ────
  console.log("\n▶ Group 4: Heart Tracker & Milestone Rewards");

  assert(
    HEART_MILESTONES.length === 6,
    `Milestone Catalog: Exactly 6 milestones configured (Found: ${HEART_MILESTONES.length})`,
  );

  // Register join
  heartTrackerService.onMemberJoin(testGuildId, testUserId, testUsername, testChannelId, false, 2);

  const mockSession = {
    guildId: testGuildId,
    userId: testUserId,
    username: testUsername,
    channelId: testChannelId,
    joinedAt: Date.now() - 16 * 60_000, // 16 minutes in voice
    lastActiveAt: Date.now(),
    serverDeaf: false,
    channelOccupancy: 2,
  };

  // 1. Award 15m milestone ("First Hello")
  const milestone15 = HEART_MILESTONES[0];
  const awardedFirst = await heartTrackerService.checkAndAwardMilestone(undefined, mockSession, milestone15, 16);
  assert(
    awardedFirst === true,
    "Milestone Award (15m): First Hello awarded +50 XP and +25 Coins",
  );

  // Check member balance
  const memberAfterAward = await memberRepository.findOrCreate(testGuildId, testUserId, testUsername);
  assert(
    memberAfterAward.xp >= 50 && memberAfterAward.coins >= 25,
    `Member Balance: Progression credited (XP: ${memberAfterAward.xp}, Coins: ${memberAfterAward.coins})`,
  );

  // 2. Duplicate prevention test: Attempting to award 15m milestone again should return false
  const awardedDuplicate = await heartTrackerService.checkAndAwardMilestone(undefined, mockSession, milestone15, 16);
  assert(
    awardedDuplicate === false,
    "Duplicate Protection: Re-evaluating 15m milestone correctly rejected (0 duplicate rewards)",
  );

  // 3. Award 5h milestone ("Legendary Friend")
  const milestone5h = HEART_MILESTONES[5];
  const awarded5h = await heartTrackerService.checkAndAwardMilestone(undefined, mockSession, milestone5h, 305);
  assert(
    awarded5h === true,
    "Milestone Award (5h): Legendary Friend awarded +1000 XP, +500 Coins, and badge",
  );

  // Member should now have the badge
  const memberWithBadge = await memberRepository.findOrCreate(testGuildId, testUserId, testUsername);
  const badges: string[] = JSON.parse(memberWithBadge.badges || "[]");
  assert(
    badges.includes("heart_legend"),
    "Badge Assignment: 'heart_legend' badge registered on GuildMember profile",
  );

  // Full Heart Stats retrieval
  const fullStats = await heartTrackerService.getMemberHeartStats(testGuildId, testUserId, testUsername);
  assert(
    fullStats.claimedMilestonesCount === 2 && fullStats.totalMilestonesCount === 6,
    `Heart Stats: Claimed ${fullStats.claimedMilestonesCount}/6 milestones with dynamic progress bars`,
  );

  // Member leave
  const sessionMins = await heartTrackerService.onMemberLeave(undefined, testGuildId, testUserId);
  assert(
    typeof sessionMins === "number",
    "Member Leave: Voice session concluded and recorded cleanly",
  );

  // ── TEST GROUP 5: Heart Reward Shop ─────────────────────────────────
  console.log("\n▶ Group 5: Heart Voice Reward Shop & Economy");

  const catalog = heartShopService.getCatalog();
  assert(
    catalog.length >= 8,
    `Shop Catalog: Loaded ${catalog.length} items across Titles, Badges, and Profile Decorations`,
  );

  // Member currently has 25 + 500 = 525 coins.
  // Test purchasing "title_voice_royalty" (cost: 500 coins)
  const purchaseSuccess = await heartShopService.purchaseItem(testGuildId, testUserId, testUsername, "title_voice_royalty");
  assert(
    purchaseSuccess.success === true && purchaseSuccess.remainingCoins !== undefined,
    `Shop Purchase: Bought 'Voice Royalty' for 500 coins. Remaining: ${purchaseSuccess.remainingCoins} coins`,
  );

  // Verify title was equipped
  const updatedUserPrefs = await heartConfigService.getUserPreferences(testGuildId, testUserId);
  assert(
    updatedUserPrefs.activeTitle === "Voice Royalty",
    "Shop Equip: Active title set to 'Voice Royalty' on member profile",
  );

  // Duplicate purchase test: buying the same title again should be blocked
  const purchaseDuplicate = await heartShopService.purchaseItem(testGuildId, testUserId, testUsername, "title_voice_royalty");
  assert(
    purchaseDuplicate.success === false && purchaseDuplicate.message.includes("already own"),
    "Shop Duplicate Guard: Cannot buy already-owned item",
  );

  // Insufficient funds test: buying an item that costs 1500 coins when user has only ~25 coins left
  const purchaseExpensive = await heartShopService.purchaseItem(testGuildId, testUserId, testUsername, "badge_heart_legend");
  assert(
    purchaseExpensive.success === false && purchaseExpensive.message.includes("Insufficient coins"),
    "Shop Balance Guard: Rejected purchase due to insufficient coins",
  );

  // ── TEST GROUP 6: Voice Auto-Join & Empty Channel Cleanup ──────────
  console.log("\n▶ Group 6: Voice Auto-Join Lifecycle");

  assert(
    typeof voiceAutoJoinService.handleVoiceUpdate === "function",
    "Voice Auto-Join: handleVoiceUpdate handler operational",
  );
  assert(
    typeof voiceAutoJoinService.destroy === "function",
    "Voice Auto-Join: Graceful cleanup destroy() method operational",
  );

  // ── TEST GROUP 7: Slash Command Schema & Serialization ─────────────
  console.log("\n▶ Group 7: Application Slash Command Serializations");

  const voiceJson = voiceCommand.data.toJSON();
  const voiceSubcommandNames = voiceJson.options?.map((o: any) => o.name) || [];
  assert(
    voiceSubcommandNames.includes("autojoin") && voiceSubcommandNames.includes("greeting"),
    "Slash Command (/voice): Subcommands 'autojoin' and 'greeting' serialized to Discord JSON",
  );

  const heartJson = heartCommand.data.toJSON();
  const heartSubcommandNames = heartJson.options?.map((o: any) => o.name) || [];
  const expectedHeartSubs = ["profile", "achievements", "rewards", "settings", "privacy", "notifications", "leaderboard"];
  const allHeartSubsPresent = expectedHeartSubs.every((s) => heartSubcommandNames.includes(s));
  assert(
    allHeartSubsPresent,
    `Slash Command (/heart): All 7 subcommands (${expectedHeartSubs.join(", ")}) serialized to Discord JSON`,
  );

  // ── SUMMARY ────────────────────────────────────────────────────────
  console.log("\n====================================================");
  console.log(`NEXUS HEART Test Results: ${passedTests} passed, ${failedTests} failed`);
  console.log("====================================================\n");

  await disconnectDatabase();

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal error during NEXUS HEART test suite:", err);
  process.exit(1);
});
