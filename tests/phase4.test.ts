/**
 * Automated Verification Suite for NEXUS AI — Phase 4.
 * Tests Advanced AI Brain:
 * - Provider Interfaces & Fallback Hierarchy (Gemini, OpenAI, Fallback)
 * - Intelligent Rule-Based Fallback Engine (English + Native Telugu లిపి)
 * - Isolated Conversation Memory & User Privacy Controls
 * - Community Facts & FAQ Knowledge Registry
 * - AI Orchestrator (Multi-Provider Routing, LRU Caching, Rate Limiting)
 * - Discussion Summarizer & Announcement Drafter
 * - AI Module Metadata and Event Listeners
 */

import "dotenv/config";
import { connectDatabase, disconnectDatabase, prisma } from "../src/database/index.js";
import { geminiProvider } from "../src/modules/ai/providers/gemini.provider.js";
import { openAIProvider } from "../src/modules/ai/providers/openai.provider.js";
import { fallbackProvider } from "../src/modules/ai/providers/fallback.provider.js";
import { memoryService } from "../src/modules/ai/services/memory.service.js";
import { communityFactsService } from "../src/modules/ai/services/community-facts.service.js";
import { aiOrchestratorService } from "../src/modules/ai/services/ai-orchestrator.service.js";
import { aiModule } from "../src/modules/ai/index.js";

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
  console.log("⚡ NEXUS AI — Phase 4 Automated Test Suite");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "999888777666555444";
  const testUserId1 = "111222333444555666";
  const testUserId2 = "222333444555666777";

  // Clean previous test state
  await prisma.conversationMemory.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.communityFact.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "AI Brain Test Guild", ownerId: testUserId1 },
  });

  // ── 1. Provider Interfaces & Metadata ──────────────────────
  console.log("1. Testing AI Provider Implementations:");
  assert(geminiProvider.name.toLowerCase().includes("gemini"), "Gemini provider exposes accurate name");
  assert(openAIProvider.name.toLowerCase().includes("openai"), "OpenAI provider exposes accurate name");
  assert(fallbackProvider.name.toLowerCase().includes("fallback"), "Fallback provider exposes accurate name");
  assert(fallbackProvider.isAvailable() === true, "Fallback provider is always available without API keys");

  // ── 2. Fallback Engine (English & Telugu) ──────────────────
  console.log("\n2. Testing Intelligent Fallback Engine (English & Telugu):");
  
  // English questions
  const enGreeting = await fallbackProvider.generateResponse([
    { role: "user", content: "Hello NEXUS, how are you today?" }
  ]);
  assert(Boolean(enGreeting.text) && enGreeting.text.length > 10, "Fallback responds to English greeting");

  const enRules = await fallbackProvider.generateResponse([
    { role: "user", content: "What are the rules of this server?" }
  ]);
  assert(enRules.text.toLowerCase().includes("rule") || enRules.text.toLowerCase().includes("respect"), "Fallback handles server rules query");

  const enVoice = await fallbackProvider.generateResponse([
    { role: "user", content: "How do voice channels work?" }
  ]);
  assert(enVoice.text.toLowerCase().includes("voice") || enVoice.text.toLowerCase().includes("room"), "Fallback handles voice system query");

  // Telugu questions (తెలుగు లిపి)
  const teGreeting = await fallbackProvider.generateResponse([
    { role: "user", content: "నమస్కారం నెమస్, ఎలా ఉన్నారు?" }
  ]);
  assert(Boolean(teGreeting.text) && /[\u0C00-\u0C7F]/.test(teGreeting.text), "Fallback responds to Telugu greeting in native Telugu script");

  const teHelp = await fallbackProvider.generateResponse([
    { role: "user", content: "నాకు సహాయం కావాలి" }
  ]);
  assert(Boolean(teHelp.text) && /[\u0C00-\u0C7F]/.test(teHelp.text), "Fallback responds to Telugu help request in native Telugu script");

  const teRules = await fallbackProvider.generateResponse([
    { role: "user", content: "ఈ సర్వర్ నిబంధనలు ఏమిటి?" }
  ]);
  assert(Boolean(teRules.text) && (teRules.text.includes("గౌరవించండి") || teRules.text.includes("నిబంధనలు") || teRules.text.includes("సహాయం")), "Fallback handles Telugu rules query");

  // ── 3. Isolated Conversation Memory ────────────────────────
  console.log("\n3. Testing Per-User Isolated Conversation Memory:");

  // User 1 stores messages
  await memoryService.addMessage(testGuildId, testUserId1, "user", "My favorite programming language is TypeScript.");
  await memoryService.addMessage(testGuildId, testUserId1, "assistant", "TypeScript provides great type safety!");
  await memoryService.addMessage(testGuildId, testUserId1, "user", "I am building a Discord bot named NEXUS.");

  const u1History = await memoryService.getHistory(testGuildId, testUserId1, 10);
  assert(u1History.length === 3, "User 1 has 3 conversation memory records retrieved");
  assert(u1History[0].content.includes("TypeScript"), "Chronological order preserved for User 1");

  // User 2 privacy isolation: User 2 must see 0 messages
  const u2History = await memoryService.getHistory(testGuildId, testUserId2, 10);
  assert(u2History.length === 0, "User 2 cannot see User 1's conversation memory (Strict Privacy Isolation)");

  // User 1 clear memory
  const deletedCount = await memoryService.clearMemory(testGuildId, testUserId1);
  assert(deletedCount === 3, "User 1 successfully purged their conversation memory on demand");
  const u1HistoryAfter = await memoryService.getHistory(testGuildId, testUserId1, 10);
  assert(u1HistoryAfter.length === 0, "User 1 memory is empty after clear");

  // ── 4. Community Facts & FAQ Registry ──────────────────────
  console.log("\n4. Testing Community Facts & FAQ Registry:");
  
  await communityFactsService.setFact(
    testGuildId,
    "streaming-schedule",
    "Community stream happens every Saturday at 8 PM IST.",
    testUserId1
  );
  await communityFactsService.setFact(
    testGuildId,
    "minecraft-server",
    "The server IP is mc.nexuscommunity.org port 25565.",
    testUserId1
  );

  const allFacts = await communityFactsService.getAllFacts(testGuildId);
  assert(allFacts.length === 2, "Community facts stored and retrieved (2 facts)");

  const matched = await communityFactsService.findRelevantFacts(testGuildId, "when is the stream?");
  assert(matched.length >= 1, "Semantic/keyword fact search matches 'stream' query");
  assert(matched.some((m) => m.includes("STREAMING-SCHEDULE")), "Matched correct topic 'streaming-schedule'");

  const deletedFact = await communityFactsService.deleteFact(testGuildId, "minecraft-server");
  assert(deletedFact === true, "Community fact deleted successfully");
  const remainingFacts = await communityFactsService.getAllFacts(testGuildId);
  assert(remainingFacts.length === 1, "Remaining facts count is 1 after deletion");

  // ── 5. AI Orchestrator ─────────────────────────────────────
  console.log("\n5. Testing AI Orchestrator Service:");
  
  // Basic query
  const queryRes = await aiOrchestratorService.ask(
    testGuildId,
    testUserId1,
    "TestUser1",
    "What is NEXUS AI?",
  );
  assert(Boolean(queryRes.text) && queryRes.text.length > 10, "Orchestrator generates response via available provider chain");
  assert(Boolean(queryRes.provider), `Response generated by provider: ${queryRes.provider}`);

  // Telugu query through orchestrator
  const teluguQueryRes = await aiOrchestratorService.ask(
    testGuildId,
    testUserId1,
    "TestUser1",
    "నమస్కారం, మీరు ఎవరు?",
  );
  assert(Boolean(teluguQueryRes.text), "Orchestrator processes Telugu query seamlessly");

  // Response Caching: Querying exact same prompt within cache window
  const cachedRes = await aiOrchestratorService.ask(
    testGuildId,
    testUserId1,
    "TestUser1",
    "What is NEXUS AI?",
  );
  assert(cachedRes.provider.includes("Cache") || cachedRes.text === queryRes.text, "Response caching returns cached result for identical query");

  // Rate Limiting: Check rate limit threshold
  const rateLimitStatus = aiOrchestratorService.checkRateLimit(testUserId2);
  assert(!rateLimitStatus.limited, "New user starts with full rate limit quota");
  assert(rateLimitStatus.remaining === 9, "Remaining rate limit quota accurately decremented");

  // Conversation Summarization
  const testChannelMessages = [
    { author: "Alice", content: "Hey everyone, welcome to the game night discussion!" },
    { author: "Bob", content: "I vote we play Valorant or Among Us tonight." },
    { author: "Charlie", content: "Among Us sounds fun for a big group, let's start at 9 PM." },
  ];
  const summary = await aiOrchestratorService.summarize(testGuildId, "game-night", testChannelMessages);
  assert(Boolean(summary) && summary.length > 20, "Channel conversation summarizer returns cohesive overview");

  // Announcement Drafting
  const announcement = await aiOrchestratorService.draftAnnouncement(
    testGuildId,
    "Weekend Gaming Tournament with 5,000 XP Prize Pool",
    "hype"
  );
  assert(Boolean(announcement) && announcement.length > 30, "Announcement drafter generates Discord-ready announcement");

  // ── 6. AI Module Definition & Events ───────────────────────
  console.log("\n6. Testing AI Module Definition & Commands:");
  assert(aiModule.name === "ai", "AI Module named 'ai'");
  assert(aiModule.commands.length >= 1, "AI Module registers '/ai' command group");
  assert(aiModule.events.length >= 1, "AI Module registers 'messageCreate' event listener for direct mentions");

  // Clean test data
  await prisma.conversationMemory.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.communityFact.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);

  await disconnectDatabase();

  console.log("\n====================================================");
  console.log(`Phase 4 Test Results: ${passedTests} Passed | ${failedTests} Failed`);
  console.log("====================================================\n");

  if (failedTests > 0) {
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
