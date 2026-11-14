/**
 * Comprehensive Automated Verification Suite for NEXUS AI — Phase 1.
 * Tests configuration, database repositories, security validators,
 * rate limiters, module lifecycle, and telemetry.
 */

import "dotenv/config";
import { config } from "../src/config/index.js";
import {
  connectDatabase,
  disconnectDatabase,
  prisma,
  guildRepository,
  memberRepository,
  moduleConfigRepository,
  auditRepository,
} from "../src/database/index.js";
import { RateLimiter } from "../src/security/rate-limiter.js";
import {
  sanitizeString,
  validateSnowflake,
  validateUrl,
  escapeMarkdown,
  validateTimezone,
  validateLocale,
} from "../src/security/validators.js";
import { moduleLoader } from "../src/handlers/moduleLoader.js";
import { coreModule } from "../src/modules/core/index.js";
import { formatBytes, formatDuration } from "../src/utils/helpers.js";

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
  assert(Boolean(config.database.url), "Database URL is configured");
  assert(config.logLevel === "info" || Boolean(config.logLevel), "Log level is defined");
  assert(config.deploymentMode === "server" || config.deploymentMode === "android", "Deployment mode is valid");

  // ── 2. Security & Sanitization Validators ───────────────
  console.log("\n2. Testing Security & Input Validators:");
  assert(validateSnowflake("123456789012345678"), "Valid 18-digit Discord Snowflake accepted");
  assert(!validateSnowflake("abc12345"), "Non-numeric Snowflake rejected");
  assert(!validateSnowflake("12345"), "Short Snowflake rejected");

  assert(validateUrl("https://discord.com"), "HTTPS URL validated");
  assert(!validateUrl("ftp://invalidscheme.com") && !validateUrl("not_a_url"), "Invalid URLs rejected");

  assert(escapeMarkdown("*hello* **world**") === "\\*hello\\* \\*\\*world\\*\\*", "Markdown characters escaped safely");
  assert(sanitizeString("  Clean \x00 String \x1F ") === "Clean  String", "Non-printable control characters stripped");

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

  // ── 4. Formatting Utilities ──────────────────────────────
  console.log("\n4. Testing Helper Utilities:");
  assert(formatDuration(90_061_000) === "1d 1h 1m 1s", "Duration formatted correctly");
  assert(formatBytes(1024 * 1024 * 350) === "350 MB", "Byte unit formatting matches host targets");

  // ── 5. Database Repositories (SQLite WAL) ────────────────
  console.log("\n5. Testing Database Repositories (SQLite Persistence):");
  await connectDatabase();

  const testGuildId = "999888777666555444";
  const testUserId = "111222333444555666";

  // Clean previous test state if present
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);

  // Guild Repo
  const guild = await guildRepository.findOrCreate(testGuildId, "Test Guild Alpha", "owner-123");
  assert(guild.id === testGuildId, "Guild findOrCreate persisted record");

  await guildRepository.update(testGuildId, { locale: "te", timezone: "Asia/Kolkata" });
  const updatedGuild = await guildRepository.findById(testGuildId);
  assert(updatedGuild?.locale === "te" && updatedGuild?.timezone === "Asia/Kolkata", "Guild settings updated");

  // Member Repo
  const member = await memberRepository.findOrCreate(testGuildId, testUserId, "NexusUser");
  assert(member.userId === testUserId && member.xp === 0, "Member record initialized");

  await memberRepository.update(testGuildId, testUserId, { xp: 150, level: 2, voiceMinutes: 45 });
  const updatedMember = await memberRepository.findByGuildAndUser(testGuildId, testUserId);
  assert(updatedMember?.xp === 150 && updatedMember?.level === 2 && updatedMember?.voiceMinutes === 45, "Member progression updated");

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

  // ── 6. Module System Lifecycle ───────────────────────────
  console.log("\n6. Testing Module System Lifecycle:");
  await moduleLoader.load(coreModule);
  assert(moduleLoader.size >= 1, "Core module loaded into ModuleLoader");
  assert(moduleLoader.get("core")?.name === "core", "Module retrieved by identifier");

  const health = await coreModule.healthCheck();
  assert(health.status === "healthy", "Core module health check passed");
  assert(coreModule.commands.length === 3, "Core module exports 3 foundational commands (nexus, help, admin)");
  assert(coreModule.events.length === 4, "Core module exports 4 core events (ready, guildCreate, guildDelete, interactionCreate)");

  await disconnectDatabase();

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
