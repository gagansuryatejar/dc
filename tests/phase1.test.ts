/**
 * NEXUS AI — Phase 1 Automated Test Suite
 * Covers: configuration, database (PostgreSQL), security validators,
 * rate limiter, module lifecycle, and command framework.
 *
 * Prerequisites:
 *   - .env configured with a valid DATABASE_URL (PostgreSQL)
 *   - npm run db:generate  (Prisma client generated)
 *   - npm run db:push      (schema pushed to PostgreSQL)
 *
 * Run: npm test  (or tsx tests/phase1.test.ts)
 */

import "dotenv/config";
import { config } from "../src/config/index.js";
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  databaseHealth,
  guildRepository,
  memberRepository,
  moduleConfigRepository,
  auditRepository,
} from "../src/database/index.js";
import { RateLimiter, commandLimiter, adminLimiter, interactionLimiter } from "../src/security/rate-limiter.js";
import {
  sanitizeString,
  validateSnowflake,
  validateUrl,
  escapeMarkdown,
  validateTimezone,
  validateLocale,
} from "../src/security/validators.js";
import { moduleLoader } from "../src/handlers/moduleLoader.js";
import coreModule from "../src/modules/core/index.js";
import { formatDuration, formatBytes } from "../src/utils/helpers.js";

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
  console.log("⚡ NEXUS AI — Phase 1 Automated Test Suite");
  console.log("====================================================\n");

  // ── 1. Configuration Engine ─────────────────────────────
  console.log("1. Testing Configuration Engine:");
  assert(typeof config.discord.token === "string" && config.discord.token.length > 0, "DISCORD_TOKEN configured");
  assert(typeof config.discord.clientId === "string" && config.discord.clientId.length > 0, "DISCORD_CLIENT_ID configured");
  assert(
    typeof config.database.url === "string" &&
      (config.database.url.startsWith("postgresql://") || config.database.url.startsWith("file:")),
    "DATABASE_URL uses PostgreSQL or SQLite",
  );
  assert(["trace","debug","info","warn","error","fatal"].includes(config.logLevel), "Log level is valid");
  assert(config.nodeEnv === "development" || config.nodeEnv === "production" || config.nodeEnv === "test", "Node env is valid");
  assert(config.deploymentMode === "server", "Deployment mode is 'server'");

  // ── 2. Security & Input Validators ───────────────────────
  console.log("\n2. Testing Security & Input Validators:");
  assert(validateSnowflake("123456789012345678"), "Valid 18-digit Discord Snowflake accepted");
  assert(validateSnowflake("12345678901234567890"), "Valid 20-digit Snowflake accepted");
  assert(!validateSnowflake("abc12345"), "Non-numeric Snowflake rejected");
  assert(!validateSnowflake("12345"), "Short Snowflake rejected");
  assert(!validateSnowflake(12345 as unknown as string), "Non-string Snowflake rejected");

  assert(validateUrl("https://discord.com"), "HTTPS URL validated");
  assert(validateUrl("http://localhost:4000"), "HTTP URL validated");
  assert(!validateUrl("ftp://invalidscheme.com"), "FTP URL rejected");
  assert(!validateUrl("not_a_url"), "Invalid URL rejected");

  assert(escapeMarkdown("*hello* **world**") === "\\*hello\\* \\*\\*world\\*\\*", "Markdown characters escaped safely");
  assert(sanitizeString("  Clean \x00 String \x1F ") === "Clean  String", "Non-printable control characters stripped");
  assert(sanitizeString("A".repeat(5000), 100).length === 100, "String truncated to maxLength");

  assert(validateTimezone("Asia/Kolkata"), "IANA Timezone 'Asia/Kolkata' validated");
  assert(validateTimezone("UTC"), "IANA Timezone 'UTC' validated");
  assert(!validateTimezone("Fantasy/InvalidZone"), "Invalid Timezone rejected");

  assert(validateLocale("en") && validateLocale("te"), "Supported locales ('en', 'te') accepted");
  assert(!validateLocale("fr"), "Unsupported locale rejected");

  // ── 3. Sliding-Window Rate Limiter ───────────────────────
  console.log("\n3. Testing Sliding-Window Rate Limiter:");
  const testLimiter = new RateLimiter(1000, 3);
  const r1 = testLimiter.consume("user-1");
  const r2 = testLimiter.consume("user-1");
  const r3 = testLimiter.consume("user-1");
  const r4 = testLimiter.consume("user-1"); // Should be limited

  assert(!r1.limited && r1.remaining === 2, "1st request allowed (remaining: 2)");
  assert(!r2.limited && r2.remaining === 1, "2nd request allowed (remaining: 1)");
  assert(!r3.limited && r3.remaining === 0, "3rd request allowed (remaining: 0)");
  assert(r4.limited && r4.remaining === 0, "4th request blocked by rate limiter");

  testLimiter.reset("user-1");
  assert(!testLimiter.isLimited("user-1"), "Rate limit reset cleared tracking");
  testLimiter.destroy();

  // Default limiters are instantiated
  assert(commandLimiter instanceof RateLimiter, "commandLimiter instantiated");
  assert(adminLimiter instanceof RateLimiter, "adminLimiter instantiated");
  assert(interactionLimiter instanceof RateLimiter, "interactionLimiter instantiated");

  // ── 4. Helper Utilities ────────────────────────────────
  console.log("\n4. Testing Helper Utilities:");
  assert(formatDuration(90_061_000) === "1d 1h 1m 1s", "Duration formatted correctly");
  assert(formatBytes(1024 * 1024 * 350) === "350 MB", "Byte unit formatting matches targets");

  // ── 5. Database Repositories (PostgreSQL) ────────────────
  console.log("\n5. Testing Database Repositories (PostgreSQL Persistence):");

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
      "     run `npm run db:push`, then re-run: npm test",
    );
  } else {
    const dbHealth = await databaseHealth();
    assert(dbHealth.healthy, "PostgreSQL health check passed");

    await connectDatabase();

    await connectDatabase();

    const testGuildId = "999888777666555444";
    const testUserId = "111222333444555666";

    // Clean previous test state if present
    await prisma.auditLog.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
    await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
    await prisma.moduleConfig.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
    await prisma.guild.deleteMany({ where: { id: testGuildId } }).catch(() => null);

    // Guild Repo
    const guild = await guildRepository.findOrCreate({
      id: testGuildId,
      name: "Test Guild Alpha",
      ownerId: "owner-123",
    });
    assert(guild.id === testGuildId, "Guild findOrCreate persisted record");
    assert(guild.name === "Test Guild Alpha", "Guild name persisted");

    await guildRepository.update(testGuildId, { locale: "te", timezone: "Asia/Kolkata" });
    const updatedGuild = await guildRepository.findById(testGuildId);
    assert(
      updatedGuild?.locale === "te" && updatedGuild?.timezone === "Asia/Kolkata",
      "Guild settings updated",
    );

    // Feature flags
    await guildRepository.setFeatureFlag(testGuildId, "voice", false);
    const voiceDisabled = await guildRepository.isFeatureEnabled(testGuildId, "voice");
    assert(!voiceDisabled, "Feature flag 'voice' disabled");

    await guildRepository.setFeatureFlag(testGuildId, "voice", true);
    const voiceEnabled = await guildRepository.isFeatureEnabled(testGuildId, "voice");
    assert(voiceEnabled, "Feature flag 'voice' re-enabled");

    // Member Repo
    const member = await memberRepository.findOrCreate({
      guildId: testGuildId,
      userId: testUserId,
      username: "NexusUser",
    });
    assert(member.userId === testUserId && member.xp === 0, "Member record initialized");

    await memberRepository.update(testGuildId, testUserId, { xp: 150, level: 2, voiceMinutes: 45 });
    const updatedMember = await memberRepository.findByGuildAndUser(testGuildId, testUserId);
    assert(
      updatedMember?.xp === 150 && updatedMember?.level === 2 && updatedMember?.voiceMinutes === 45,
      "Member progression updated",
    );

    await memberRepository.incrementXp(testGuildId, testUserId, 25);
    const afterIncrement = await memberRepository.findByGuildAndUser(testGuildId, testUserId);
    assert(afterIncrement?.xp === 175, "Member XP incremented");

    // Module Config Repo
    await moduleConfigRepository.setEnabled(testGuildId, "voice", false);
    const isVoiceEnabled = await moduleConfigRepository.isEnabled(testGuildId, "voice");
    assert(!isVoiceEnabled, "ModuleConfig disabled 'voice' subsystem");

    await moduleConfigRepository.setEnabled(testGuildId, "voice", true);
    const isVoiceReEnabled = await moduleConfigRepository.isEnabled(testGuildId, "voice");
    assert(isVoiceReEnabled, "ModuleConfig re-enabled 'voice' subsystem");

    // Audit Repo
    const auditEntry = await auditRepository.create(testGuildId, "SYSTEM_TEST", {
      userId: testUserId,
      details: "Automated verification test run",
      severity: "info",
    });
    assert(auditEntry.action === "SYSTEM_TEST" && auditEntry.guildId === testGuildId, "Audit log record persisted");

    const recentLogs = await auditRepository.findByGuild(testGuildId, { limit: 5 });
    assert(recentLogs.length >= 1, "Audit logs retrieved via filter");

    const countByAction = await auditRepository.countByAction(testGuildId, "SYSTEM_TEST");
    assert(countByAction >= 1, "Audit count by action works");

    // Top-by-XP leaderboard
    const topXp = await memberRepository.findTopByXp(testGuildId, 5);
    assert(Array.isArray(topXp), "Leaderboard query returns array");

    await disconnectDatabase();
  }

  // ── 6. Module System Lifecycle ───────────────────────────
  console.log("\n6. Testing Module System Lifecycle:");
  await moduleLoader.load(coreModule);
  assert(moduleLoader.size >= 1, "Core module loaded into ModuleLoader");
  assert(moduleLoader.get("core")?.name === "core", "Module retrieved by identifier");
  assert(moduleLoader.list().includes("core"), "Core module listed");

  const health = await coreModule.healthCheck();
  assert(health.status === "healthy", "Core module health check passed");
  assert(coreModule.commands.length === 3, "Core module exports 3 commands (nexus, help, admin)");
  assert(coreModule.events.length === 4, "Core module exports 4 events (ready, guildCreate, guildDelete, interactionCreate)");

  // ── Test Summary ─────────────────────────────────────────
  console.log("\n====================================================");
  console.log(`Test Execution Finished: ${passedTests} passed, ${failedTests} failed.`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Fatal test execution error:", err);
  process.exit(1);
});
