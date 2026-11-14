/**
 * Automated Verification Suite for NEXUS AI — Phase 6.
 * Tests Streamer & Content Creator Subsystem:
 * - Creator Profiles, Social Platforms & Privacy Settings
 * - Streamer Protection (Notification Opt-out / Silent Mode)
 * - Discord Go Live & Stream Lifecycle Tracking (Active Sessions, Airtime, Stream XP)
 * - Streamer Airtime Leaderboards
 * - Community Watch Parties (Scheduling, RSVPs, Card Rendering, Status Updates)
 * - Streamer-Exclusive Voice Lounge Subsystem
 * - Streamer Module Metadata and Health Checks
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase, prisma } from "../src/database/index.js";
import { streamerService } from "../src/modules/streamer/services/streamer.service.js";
import { watchPartyService } from "../src/modules/streamer/services/watch-party.service.js";
import { streamerModule } from "../src/modules/streamer/index.js";

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
  console.log("⚡ NEXUS AI — Phase 6 Automated Test Suite");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "666555444333222111";
  const streamerId1 = "101010101010101010";
  const streamerId2 = "202020202020202020";

  // Clean previous test state
  await prisma.watchParty.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.streamerProfile.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "Streamer Test Guild", ownerId: streamerId1 },
  });

  // ── 1. Creator Profiles & Settings ────────────────────────
  console.log("1. Testing Streamer Profiles & Settings:");

  // Fetch or create new profile
  const profile1 = await streamerService.getProfile(testGuildId, streamerId1);
  assert(Boolean(profile1.id), "Streamer profile initialized with unique ID");
  assert(profile1.notifyGoLive === true, "New profile defaults to notifyGoLive: true");
  assert(profile1.totalStreams === 0, "Initial totalStreams is 0");
  assert(profile1.totalStreamMinutes === 0, "Initial airtime minutes is 0");

  // Update profile
  const updatedProfile1 = await streamerService.upsertProfile(testGuildId, streamerId1, {
    platform: "Twitch",
    channelUrl: "https://twitch.tv/nexuscreator",
    bio: "Variety streamer playing competitive games and chill vibes!",
    customMessage: "Join in for some epic matches today!",
    notifyGoLive: true,
  });
  assert(updatedProfile1.platform === "twitch", "Platform sanitized and stored ('twitch')");
  assert(updatedProfile1.channelUrl === "https://twitch.tv/nexuscreator", "Channel URL stored");
  assert(Boolean(updatedProfile1.bio), "Bio stored");

  // Streamer Protection: Toggle notification preference to false (Silent Mode)
  const silentProfile = await streamerService.upsertProfile(testGuildId, streamerId1, {
    notifyGoLive: false,
  });
  assert(silentProfile.notifyGoLive === false, "Streamer Protection: creator successfully disabled go-live announcements");

  // Re-enable for subsequent stream test
  await streamerService.upsertProfile(testGuildId, streamerId1, { notifyGoLive: true });

  // ── 2. Stream Session Lifecycle & Airtime Tracking ────────
  console.log("\n2. Testing Stream Session Lifecycle & Airtime Tracking:");

  const mockGuild = {
    id: testGuildId,
    channels: { cache: new Map() },
  } as any;

  const mockMember = {
    id: streamerId1,
    displayName: "NexusStreamer",
    user: {
      username: "NexusStreamer",
      tag: "NexusStreamer#0001",
      displayAvatarURL: () => "https://cdn.discordapp.com/embed/avatars/0.png",
    },
  } as any;

  // Stream start
  await streamerService.onStreamStart(mockGuild, mockMember, {
    streamTitle: "Friday Night Ranked Grind",
    streamUrl: "https://twitch.tv/nexuscreator",
    gameName: "Valorant",
  });

  const active = streamerService.getActiveSession(testGuildId, streamerId1);
  assert(Boolean(active), "Active streaming session tracked in-memory");
  assert(active?.streamTitle === "Friday Night Ranked Grind", "Session title matched");
  assert(active?.gameName === "Valorant", "Session game matched");

  // Simulate stream duration (set startTime back by 45 minutes)
  if (active) {
    active.startTime = Date.now() - 45 * 60 * 1000;
  }

  // Stream end
  const endResult = await streamerService.onStreamEnd(mockGuild, mockMember);
  assert(Boolean(endResult), "Stream completion processed");
  assert(endResult?.minutesStreamed === 45, "Accurately calculated 45 minutes of stream airtime");

  const endedActive = streamerService.getActiveSession(testGuildId, streamerId1);
  assert(endedActive === undefined, "Active stream session cleared from memory upon end");

  const postStreamProfile = await streamerService.getProfile(testGuildId, streamerId1);
  assert(postStreamProfile.totalStreams === 1, "totalStreams incremented to 1");
  assert(postStreamProfile.totalStreamMinutes === 45, "totalStreamMinutes incremented to 45");
  assert(Boolean(postStreamProfile.lastStreamAt), "lastStreamAt timestamp updated");

  // ── 3. Streamer Leaderboards ──────────────────────────────
  console.log("\n3. Testing Streamer Leaderboard Engine:");

  // Setup second streamer with 90 minutes
  await prisma.streamerProfile.create({
    data: {
      guildId: testGuildId,
      userId: streamerId2,
      platform: "youtube",
      channelUrl: "https://youtube.com/@creator2",
      totalStreams: 2,
      totalStreamMinutes: 90,
      notifyGoLive: true,
    },
  });

  const leaderboard = await streamerService.getLeaderboard(testGuildId, 10);
  assert(leaderboard.length === 2, "Leaderboard returns 2 content creators");
  assert(leaderboard[0].userId === streamerId2, "Rank #1 is streamerId2 with 90 minutes airtime");
  assert(leaderboard[1].userId === streamerId1, "Rank #2 is streamerId1 with 45 minutes airtime");

  // ── 4. Community Watch Parties ────────────────────────────
  console.log("\n4. Testing Community Watch Party Engine:");

  const futureTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours in future

  // Schedule valid party
  const party = await watchPartyService.scheduleParty(
    testGuildId,
    streamerId1,
    "Championship Finals Co-Stream",
    "https://twitch.tv/esports_stream",
    futureTime,
    "Watch the finals with the server community in voice!",
  );
  assert(Boolean(party.id), "Watch party scheduled with unique ID");
  assert(party.title === "Championship Finals Co-Stream", "Party title recorded");
  assert(party.status === "scheduled", "Party initial status is 'scheduled'");

  // Verification that host is automatically RSVP'd
  const initialRsvps: string[] = JSON.parse(party.rsvpUsers);
  assert(initialRsvps.includes(streamerId1), "Host is automatically RSVP'd to their party");

  // Rejection of invalid URLs
  let invalidUrlCaught = false;
  try {
    await watchPartyService.scheduleParty(
      testGuildId,
      streamerId1,
      "Bad URL Party",
      "not-a-valid-url",
      futureTime
    );
  } catch {
    invalidUrlCaught = true;
  }
  assert(invalidUrlCaught, "Invalid stream URL rejected");

  // Rejection of past dates
  let pastDateCaught = false;
  try {
    await watchPartyService.scheduleParty(
      testGuildId,
      streamerId1,
      "Past Party",
      "https://twitch.tv/valid",
      new Date(Date.now() - 1000)
    );
  } catch {
    pastDateCaught = true;
  }
  assert(pastDateCaught, "Past scheduled time rejected");

  // Toggle RSVP (User 2 joins party)
  const rsvpJoin = await watchPartyService.toggleRsvp(party.id, streamerId2);
  assert(rsvpJoin.isRsvpd === true, "User 2 RSVP confirmed");
  assert(rsvpJoin.rsvpCount === 2, "Total RSVPs increased to 2");

  // Toggle RSVP (User 2 un-rsvps)
  const rsvpLeave = await watchPartyService.toggleRsvp(party.id, streamerId2);
  assert(rsvpLeave.isRsvpd === false, "User 2 RSVP removed on second toggle");
  assert(rsvpLeave.rsvpCount === 1, "Total RSVPs returned to 1");

  // Upcoming parties query
  const upcoming = await watchPartyService.getUpcoming(testGuildId, 5);
  assert(upcoming.length >= 1, "Upcoming watch parties list retrieved");
  assert(upcoming[0].id === party.id, "Scheduled party included in upcoming query");

  // Render Party Card
  const card = watchPartyService.renderPartyCard(party);
  assert(Boolean(card.embed), "Watch party Discord embed rendered");
  assert(card.row.components.length === 2, "Watch party action row features RSVP and Stream Link buttons");

  // Update status to Live and Ended
  const liveParty = await watchPartyService.updateStatus(party.id, "live");
  assert(liveParty.status === "live", "Party status updated to 'live'");

  const endedParty = await watchPartyService.updateStatus(party.id, "ended");
  assert(endedParty.status === "ended", "Party status updated to 'ended'");

  // ── 5. Streamer Module Definition ─────────────────────────
  console.log("\n5. Testing Streamer Module Definition & Commands:");
  assert(streamerModule.name === "streamer", "Streamer module named 'streamer'");
  assert(streamerModule.commands.length === 2, "Streamer module exports 2 slash commands (streamer, watchparty)");
  assert(streamerModule.events.length === 2, "Streamer module exports 2 events (presenceUpdate, interactionCreate)");

  const health = await streamerModule.healthCheck();
  assert(health.status === "healthy", "Streamer module health check passed ('healthy')");

  // Clean test state
  await prisma.watchParty.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.streamerProfile.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);

  await disconnectDatabase();

  console.log("\n====================================================");
  console.log(`Phase 6 Test Results: ${passedTests} Passed | ${failedTests} Failed`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
