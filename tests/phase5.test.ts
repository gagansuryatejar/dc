/**
 * Automated Verification Suite for NEXUS AI — Phase 5.
 * Tests Moderation & Support Subsystems:
 * - Automod Engine: Phishing link detection, mention spam, rapid spam, duplicate messages
 * - Leetspeak Normalization & Prohibited Word Filter Rules
 * - Anti-Raid Shield & Suspicious New Account Watchdog
 * - Punishment Service & Progressive Warning Escalation Ladder
 * - Infraction Logging, History & Pardon Workflows
 * - Interactive Support Ticket Subsystem & Channel Archiving
 * - Moderation Module Metadata and Health Checks
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase, prisma } from "../src/database/index.js";
import { automodService } from "../src/modules/moderation/services/automod.service.js";
import { punishmentService } from "../src/modules/moderation/services/punishment.service.js";
import { ticketService } from "../src/modules/moderation/services/ticket.service.js";
import { moderationModule } from "../src/modules/moderation/index.js";

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
  console.log("⚡ NEXUS AI — Phase 5 Automated Test Suite");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "888777666555444333";
  const testUserId1 = "123456789012345678";
  const testUserId2 = "876543210987654321";
  const testModId = "999000111222333444";

  // Clean previous test state if any
  await prisma.infraction.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.supportTicket.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.filterRule.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "Mod Test Guild", ownerId: testModId },
  });

  // ── 1. Automod Threat Detection ───────────────────────────
  console.log("1. Testing Automod Threat Detection Engine:");

  // A. Phishing detection
  const phishingRes1 = await automodService.analyzeMessage(
    testGuildId,
    testUserId1,
    "Hey check this out! Free discord nitro at http://discord-nitro.ru/gift",
    0
  );
  assert(phishingRes1.flagged === true, "Phishing link flagged (discord-nitro.ru)");
  assert(phishingRes1.violationType === "phishing", "Violation classified as phishing");
  assert(phishingRes1.recommendedAction === "timeout", "Phishing triggers timeout recommendation");

  const phishingRes2 = await automodService.analyzeMessage(
    testGuildId,
    testUserId1,
    "Claim your free steam trade: https://steamcommuniity.com/trade/claim",
    0
  );
  assert(phishingRes2.flagged === true, "Phishing link flagged (steamcommuniity typo-squat)");

  const cleanMsgRes = await automodService.analyzeMessage(
    testGuildId,
    testUserId1,
    "Hello everyone, welcome to the community chat!",
    0
  );
  assert(cleanMsgRes.flagged === false, "Legitimate chat message passes cleanly");

  // B. Mention spam detection
  const mentionSpamRes = await automodService.analyzeMessage(
    testGuildId,
    testUserId1,
    "Hey you all need to see this right now!",
    6 // 6 mentions exceeds threshold of 5
  );
  assert(mentionSpamRes.flagged === true, "Mention spam detected with 6 mentions");
  assert(mentionSpamRes.violationType === "mention_spam", "Violation classified as mention_spam");

  // C. Rapid message spam
  let rapidSpamTriggered = false;
  for (let i = 0; i < 7; i++) {
    const res = await automodService.analyzeMessage(
      testGuildId,
      "spammer-user-id",
      `Spam message index ${i} unique text`,
      0
    );
    if (res.flagged && res.violationType === "spam") {
      rapidSpamTriggered = true;
      break;
    }
  }
  assert(rapidSpamTriggered, "Rapid message rate limit spam detected (>5 messages in 4s)");

  // D. Duplicate / repeated message spam
  await automodService.analyzeMessage(testGuildId, testUserId2, "Subscribe to my channel!", 0);
  await automodService.analyzeMessage(testGuildId, testUserId2, "Subscribe to my channel!", 0);
  const dupRes = await automodService.analyzeMessage(
    testGuildId,
    testUserId2,
    "Subscribe to my channel!",
    0
  );
  assert(dupRes.flagged === true, "Repeated identical message detected on 3rd send");
  assert(dupRes.violationType === "duplicate", "Violation classified as duplicate");

  // ── 2. Text Normalization & Configurable Word Filter ───────
  console.log("\n2. Testing Word Filter & Leetspeak Normalization:");

  // Test normalization
  const norm1 = automodService.normalizeText("H-e-l-l-o W_0_r_l_d");
  assert(norm1.includes("helloworld"), "Punctuation and spacing stripped in normalization");

  const normLeet = automodService.normalizeText("b@d_w0rd!");
  assert(normLeet.includes("badwordi"), "Leetspeak symbols normalized (@->a, 0->o, !->i)");

  // Add a filter rule to database
  await prisma.filterRule.create({
    data: {
      guildId: testGuildId,
      pattern: "prohibitedword",
      action: "delete_warn",
      enabled: true,
    },
  });

  const filterDirectMatch = await automodService.analyzeMessage(
    testGuildId,
    testUserId1,
    "You should not say prohibitedword in chat",
    0
  );
  assert(filterDirectMatch.flagged === true, "Configured prohibited word filtered directly");
  assert(filterDirectMatch.violationType === "filtered_word", "Violation classified as filtered_word");

  const filterObfuscatedMatch = await automodService.analyzeMessage(
    testGuildId,
    testUserId1,
    "Check out this p.r.0.h.i.b.i.t.e.d.w.0.r.d here",
    0
  );
  assert(filterObfuscatedMatch.flagged === true, "Obfuscated / leetspeak prohibited word detected");

  // ── 3. Anti-Raid Shield & Suspicious Account Watchdog ──────
  console.log("\n3. Testing Anti-Raid Shield & Account Age Watchdog:");

  const now = Date.now();
  // Suspicious account: created 2 hours ago
  const newAccountDate = new Date(now - 2 * 60 * 60 * 1000);
  const joinCheck1 = automodService.analyzeJoin(testGuildId, newAccountDate, now);
  assert(joinCheck1.isSuspiciousAccount === true, "Account created 2 hours ago flagged as suspicious");
  assert(joinCheck1.accountAgeHours === 2, "Accurately calculated account age (2 hours)");

  // Established account: created 100 days ago
  const oldAccountDate = new Date(now - 100 * 24 * 60 * 60 * 1000);
  const joinCheck2 = automodService.analyzeJoin(testGuildId, oldAccountDate, now);
  assert(joinCheck2.isSuspiciousAccount === false, "Established account not flagged as suspicious");

  // Raid wave test: 5 joins in quick succession
  for (let i = 0; i < 4; i++) {
    automodService.analyzeJoin("raid-test-guild", oldAccountDate, now);
  }
  const raidWaveCheck = automodService.analyzeJoin("raid-test-guild", oldAccountDate, now);
  assert(raidWaveCheck.isRaid === true, "Raid wave detected on 5th rapid join in 10 seconds");

  // Manual raid shield toggle
  automodService.setRaidShield(testGuildId, true);
  assert(automodService.isRaidShieldActive(testGuildId) === true, "Manual raid shield lockdown activated");
  automodService.setRaidShield(testGuildId, false);
  assert(automodService.isRaidShieldActive(testGuildId) === false, "Manual raid shield lockdown deactivated");

  // ── 4. Punishment & Progressive Escalation Ladder ──────────
  console.log("\n4. Testing Punishment Service & Warning Escalation Ladder:");

  // Verify escalation math
  const esc1 = punishmentService.evaluateEscalation(1);
  assert(esc1.action === "warn", "1 warning results in formal notice");

  const esc2 = punishmentService.evaluateEscalation(2);
  assert(esc2.action === "timeout" && esc2.durationMinutes === 10, "2 warnings escalates to 10-minute timeout");

  const esc3 = punishmentService.evaluateEscalation(3);
  assert(esc3.action === "timeout" && esc3.durationMinutes === 60, "3 warnings escalates to 1-hour timeout");

  const esc4 = punishmentService.evaluateEscalation(4);
  assert(esc4.action === "timeout" && esc4.durationMinutes === 1440, "4 warnings escalates to 24-hour timeout");

  // Record real warning infractions in SQLite
  const warnRecord1 = await punishmentService.recordInfraction(
    testGuildId,
    testUserId1,
    testModId,
    "warn",
    "Rule 1: Disrespectful behavior"
  );
  assert(Boolean(warnRecord1.infraction.id), "Infraction #1 created with UUID");
  assert(warnRecord1.escalation.warningsCount === 1, "Infraction #1 sets warning count to 1");

  const warnRecord2 = await punishmentService.recordInfraction(
    testGuildId,
    testUserId1,
    testModId,
    "warn",
    "Rule 3: Advertising without permission"
  );
  assert(warnRecord2.escalation.warningsCount === 2, "Infraction #2 sets warning count to 2");
  assert(warnRecord2.escalation.action === "timeout", "Infraction #2 automatically triggers timeout escalation");
  assert(warnRecord2.escalation.durationMinutes === 10, "Infraction #2 specifies 10m duration");

  // History retrieval
  const history = await punishmentService.getHistory(testGuildId, testUserId1);
  assert(history.length === 2, "Member history retrieves 2 infraction records");

  // Pardon workflow
  const pardonSuccess = await punishmentService.pardonInfraction(
    testGuildId,
    warnRecord1.infraction.id,
    testModId
  );
  assert(pardonSuccess === true, "Infraction successfully pardoned");

  const historyAfterPardon = await punishmentService.getHistory(testGuildId, testUserId1);
  const activeRemaining = historyAfterPardon.filter((h) => h.active).length;
  assert(activeRemaining === 1, "Active warning count decreased to 1 after pardon");

  // ── 5. Support Ticket Subsystem ────────────────────────────
  console.log("\n5. Testing Interactive Support Ticket Subsystem:");

  // Render panel
  const panel = ticketService.renderPanel();
  assert(panel.embeds.length === 1, "Support panel renders 1 branded embed");
  assert(panel.components.length === 1, "Support panel renders 1 action row");
  assert(panel.components[0].components.length === 4, "Support panel features 4 categorized buttons (General, Report, Appeal, VIP)");

  // Database-only ticket creation
  const mockUser = { id: testUserId1, username: "TicketTester" } as any;
  const mockGuild = { id: testGuildId, roles: { everyone: { id: "everyone" } }, channels: { create: async () => null } } as any;

  const { ticket: createdTicket } = await ticketService.createTicket(
    mockGuild,
    mockUser,
    "appeal",
    "Appeal warning #2"
  );
  assert(Boolean(createdTicket.id), "Support ticket created in SQLite");
  assert(createdTicket.ticketNumber === 1, "First ticket assigned sequential ticketNumber #1");
  assert(createdTicket.status === "open", "Initial ticket status is 'open'");
  assert(createdTicket.category === "appeal", "Ticket category is 'appeal'");

  // Duplicate ticket prevention
  let dupPrevented = false;
  try {
    await ticketService.createTicket(mockGuild, mockUser, "appeal", "Duplicate attempt");
  } catch (err: unknown) {
    dupPrevented = true;
  }
  assert(dupPrevented, "Duplicate active ticket in same category prevented for user");

  // Retrieve ticket
  const fetchedTicket = await ticketService.getTicket(createdTicket.id);
  assert(fetchedTicket?.id === createdTicket.id, "Ticket retrieved by ID");

  // Close ticket
  const closedTicket = await ticketService.closeTicket(
    testGuildId,
    createdTicket.id,
    testModId,
    "Resolved: Warning pardoned and user educated"
  );
  assert(closedTicket.status === "closed", "Ticket status transitioned to 'closed'");
  assert(closedTicket.closedBy === testModId, "Ticket records staff member who closed it");
  assert(Boolean(closedTicket.closedAt), "Ticket records closure timestamp");

  // ── 6. Moderation Module Definition ───────────────────────
  console.log("\n6. Testing Moderation Module Definition & Commands:");
  assert(moderationModule.name === "moderation", "Moderation module named 'moderation'");
  assert(moderationModule.commands.length === 8, "Moderation module exports 8 slash commands (warn, timeout, untimeout, kick, ban, unban, mod, ticket)");
  assert(moderationModule.events.length === 3, "Moderation module exports 3 event handlers (messageCreate, guildMemberAdd, interactionCreate)");

  const health = await moderationModule.healthCheck();
  assert(health.status === "healthy", "Moderation module health check passed ('healthy')");

  // Clean test state
  await prisma.infraction.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.supportTicket.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.filterRule.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);

  await disconnectDatabase();

  console.log("\n====================================================");
  console.log(`Phase 5 Test Results: ${passedTests} Passed | ${failedTests} Failed`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
