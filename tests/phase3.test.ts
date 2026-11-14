/**
 * Automated Verification Suite for NEXUS AI — Phase 3.
 * Tests Voice Activity Tracking, Voice Milestone Celebrations, Temporary Voice Rooms,
 * Voice Assistant Audio Advisor, and Explicit Consent Management.
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase, memberRepository, prisma } from "../src/database/index.js";
import { voiceTrackerService, VOICE_MILESTONES } from "../src/modules/voice/services/voice-tracker.service.js";
import { voiceAssistantService } from "../src/modules/voice/services/voice-assistant.service.js";
import { tempRoomService } from "../src/modules/voice/services/temp-room.service.js";
import { voiceModule } from "../src/modules/voice/index.js";

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
  console.log("⚡ NEXUS AI — Phase 3 Automated Test Suite");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "777666555444333222";
  const testUserId = "333444555666777888";
  const testChannelId = "voice-channel-alpha";

  // Clean previous test state if any
  await prisma.tempVoiceChannel.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "Voice Test Server", ownerId: testUserId },
  });

  // ── 1. Voice Milestones Configuration ─────────────────────
  console.log("1. Testing Voice Milestones Registry:");
  assert(VOICE_MILESTONES.length === 4, "4 voice milestones defined (30m, 1h, 3h, 5h)");
  assert(VOICE_MILESTONES.some((m) => m.minutes === 30 && m.badgeId === "voice_30m"), "Voice Explorer milestone configured at 30 mins");
  assert(VOICE_MILESTONES.some((m) => m.minutes === 60 && m.badgeId === "voice_1h"), "Voice Regular milestone configured at 60 mins");
  assert(VOICE_MILESTONES.some((m) => m.minutes === 180 && m.badgeId === "voice_3h"), "Voice Champion milestone configured at 180 mins");
  assert(VOICE_MILESTONES.some((m) => m.minutes === 300 && m.badgeId === "voice_5h"), "Community Legend milestone configured at 300 mins");

  // ── 2. Voice Activity Session Tracking ───────────────────
  console.log("\n2. Testing Voice Activity Session Tracking:");
  await voiceTrackerService.onMemberJoin(testGuildId, testUserId, "VoiceTester", testChannelId);
  const session = voiceTrackerService.getActiveSession(testGuildId, testUserId);
  assert(Boolean(session), "Active voice session registered on channel join");
  assert(session?.channelId === testChannelId, "Session channel ID matched");

  // Simulate elapsed time (e.g. 35 minutes)
  if (session) {
    session.joinedAt = Date.now() - 35 * 60 * 1000;
  }

  // Mock client
  const mockClient: any = {
    guilds: {
      cache: new Map([
        [testGuildId, { id: testGuildId, channels: { cache: new Map() } }],
      ]),
    },
  };

  const leaveResult = await voiceTrackerService.onMemberLeave(
    testGuildId,
    testUserId,
    testChannelId,
    mockClient,
  );

  assert(Boolean(leaveResult), "Session leave processed successfully");
  assert((leaveResult?.minutesSpent || 0) >= 35, "Elapsed minutes calculated correctly (>= 35 mins)");
  assert(voiceTrackerService.getActiveSession(testGuildId, testUserId) === undefined, "Active session cleared after leave");

  const memberRecord = await memberRepository.findByGuildAndUser(testGuildId, testUserId);
  assert((memberRecord?.voiceMinutes || 0) >= 35, "Voice minutes persisted in database");
  assert((memberRecord?.xp || 0) >= 135, "Voice XP awarded (35 base XP + 100 milestone bonus)");

  let badges: string[] = [];
  try {
    badges = JSON.parse(memberRecord?.badges || "[]");
  } catch {}
  assert(badges.includes("voice_30m"), "'voice_30m' badge awarded upon reaching 30-minute milestone");

  // ── 3. Temporary Voice Rooms Persistence ─────────────────
  console.log("\n3. Testing Temporary Voice Rooms Subsystem:");
  const testTempRoomId = "temp-channel-123456";

  // Simulate temp voice room database record
  await prisma.tempVoiceChannel.create({
    data: {
      id: testTempRoomId,
      guildId: testGuildId,
      ownerId: testUserId,
      name: "Private Hangout",
      isPrivate: true,
      userLimit: 5,
    },
  });

  const tempRecord = await prisma.tempVoiceChannel.findUnique({
    where: { id: testTempRoomId },
  });
  assert(Boolean(tempRecord), "Temporary voice channel record created in SQLite");
  assert(tempRecord?.isPrivate === true && tempRecord?.userLimit === 5, "Temp channel attributes persisted");

  // Simulate empty room cleanup
  const mockGuild: any = {
    id: testGuildId,
    channels: {
      cache: new Map(), // Channel no longer exists in cache
    },
  };

  const cleaned = await tempRoomService.handleRoomState(mockGuild, testTempRoomId);
  assert(cleaned === true, "Abandoned temporary room detected and cleaned from database");

  const postCleanupRecord = await prisma.tempVoiceChannel.findUnique({
    where: { id: testTempRoomId },
  });
  assert(postCleanupRecord === null, "Temporary voice channel record deleted after cleanup");

  // ── 4. Voice Assistant & Audio Optimization Advisor ─────
  console.log("\n4. Testing Audio Quality Advisor & Recommendations:");
  const mockChannelLow: any = { bitrate: 32_000 };
  const mockChannelHigh: any = { bitrate: 96_000 };

  const adviceLow = voiceAssistantService.getAudioOptimizationAdvice(mockChannelLow);
  assert(adviceLow.bitrateKbps === 32, "Bitrate converted to kbps (32)");
  assert(adviceLow.recommendation.includes("Low bitrate"), "Low bitrate flagged for improvement");

  const adviceHigh = voiceAssistantService.getAudioOptimizationAdvice(mockChannelHigh);
  assert(adviceHigh.bitrateKbps === 96, "Bitrate converted to kbps (96)");
  assert(adviceHigh.krispAdvice.includes("Krisp"), "Krisp noise suppression advice included");
  assert(adviceHigh.clippingAdvice.includes("70–80%"), "Microphone input slider clipping recommendation provided");

  // ── 5. Explicit Voice Intelligence Consent Management ────
  console.log("\n5. Testing Explicit Consent Management (Privacy Protected):");
  const initialConsent = await voiceAssistantService.hasConsent(testGuildId, testUserId);
  assert(initialConsent === false, "Voice intelligence consent defaults to false (not opted in)");

  await voiceAssistantService.setConsent(testGuildId, testUserId, true);
  const optedInConsent = await voiceAssistantService.hasConsent(testGuildId, testUserId);
  assert(optedInConsent === true, "Member successfully opted in to voice intelligence");

  await voiceAssistantService.setConsent(testGuildId, testUserId, false);
  const optedOutConsent = await voiceAssistantService.hasConsent(testGuildId, testUserId);
  assert(optedOutConsent === false, "Member successfully opted out from voice intelligence");

  // ── 6. Voice Module Structure & Slash Commands ───────────
  console.log("\n6. Testing Voice Module Definition:");
  assert(voiceModule.name === "voice", "Module name is 'voice'");
  assert(voiceModule.commands.some((c) => c.data.name === "voice"), "Module exports /voice slash command group");
  assert(voiceModule.events.length === 1, "Module exports voiceStateUpdate event handler");

  const health = await voiceModule.healthCheck();
  assert(health.status === "healthy", "Voice module health check passed");

  await disconnectDatabase();

  // ── Summary ──────────────────────────────────────────────
  console.log("\n====================================================");
  console.log(`Phase 3 Tests Finished: ${passedTests} passed, ${failedTests} failed.`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal test error:", err);
  process.exit(1);
});
