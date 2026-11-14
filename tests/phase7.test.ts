/**
 * Automated Verification Suite for NEXUS AI — Phase 7.
 * Tests Community Analytics Engine & Standalone Web Dashboard:
 * 1. Analytics Service (Daily snapshots, time-series metrics, velocity, retention)
 * 2. Anomaly Detection (Spike alerts, anti-raid join velocity, infraction alerts)
 * 3. System Telemetry Aggregator (HP All-in-One 4GB RAM monitor, Node RSS, SQLite DB size)
 * 4. Analytics JSON Export Engine
 * 5. Analytics Slash Command & Module Lifecycle (Health checks, command subcommands)
 * 6. Standalone Web Dashboard HTTP Server:
 *    - Server startup & graceful shutdown
 *    - Health endpoint (/api/health)
 *    - Overview stats endpoint (/api/stats)
 *    - Hardware telemetry endpoint (/api/system)
 *    - 7-day activity metrics (/api/analytics)
 *    - Moderation & audit endpoint (/api/moderation)
 *    - Support tickets endpoint (/api/tickets)
 *    - Module configuration endpoint (/api/modules)
 *    - Admin authentication (/api/auth/login)
 *    - Protected module toggle (/api/modules/toggle)
 *    - Static frontend SPA delivery (index.html, content-type)
 */

import "dotenv/config";
import http from "node:http";
import { connectDatabase, disconnectDatabase, prisma } from "../src/database/index.js";
import { analyticsService } from "../src/modules/analytics/services/analytics.service.js";
import { analyticsModule } from "../src/modules/analytics/index.js";
import { analyticsCommand } from "../src/modules/analytics/commands/analytics.js";
import { DashboardServer } from "../src/dashboard/server.js";
import { BOT_VERSION } from "../src/utils/constants.js";

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

// Simple HTTP request helper
function makeRequest(
  urlPath: string,
  options: {
    method?: string;
    port?: number;
    headers?: Record<string, string>;
    body?: any;
  } = {},
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any; rawBody: string }> {
  const port = options.port || 3088;
  const method = options.method || "GET";
  const postData = options.body ? JSON.stringify(options.body) : "";

  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = { ...options.headers };
    if (postData) {
      headers["Content-Type"] = "application/json";
      headers["Content-Length"] = Buffer.byteLength(postData).toString();
    }

    const req = http.request(
      {
        hostname: "127.0.0.1",
        port,
        path: urlPath,
        method,
        headers,
      },
      (res) => {
        let rawBody = "";
        res.on("data", (chunk) => (rawBody += chunk));
        res.on("end", () => {
          let parsed = rawBody;
          try {
            parsed = JSON.parse(rawBody);
          } catch {
            // Raw text if not JSON
          }
          resolve({
            statusCode: res.statusCode || 0,
            headers: res.headers,
            body: parsed,
            rawBody,
          });
        });
      },
    );

    req.on("error", (err) => reject(err));
    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function runSuite(): Promise<void> {
  console.log("\n====================================================");
  console.log("⚡ NEXUS AI — Phase 7 Automated Test Suite");
  console.log("====================================================\n");

  await connectDatabase();

  const testGuildId = "777888999000111222";
  const testUser1 = "7001";
  const testUser2 = "7002";
  const testUser3 = "7003";

  // Clean previous test state
  await prisma.dailyMetric.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.moduleConfig.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.supportTicket.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.infraction.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guildMember.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.guild.upsert({
    where: { id: testGuildId },
    update: {},
    create: { id: testGuildId, name: "Analytics Test Guild", ownerId: testUser1 },
  });

  // Seed members with activity
  const now = new Date();
  await prisma.guildMember.createMany({
    data: [
      {
        guildId: testGuildId,
        userId: testUser1,
        username: "NexusLead",
        messageCount: 150,
        voiceMinutes: 180,
        level: 8,
        lastActive: now,
      },
      {
        guildId: testGuildId,
        userId: testUser2,
        username: "VoiceKing",
        messageCount: 40,
        voiceMinutes: 320,
        level: 5,
        lastActive: now,
      },
      {
        guildId: testGuildId,
        userId: testUser3,
        username: "QuietMember",
        messageCount: 5,
        voiceMinutes: 10,
        level: 1,
        lastActive: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), // Inactive > 7d
      },
    ],
  });

  // ── TEST GROUP 1: Analytics Service & Snapshots ──────────
  console.log("▶ Group 1: Daily Snapshots & Activity Summary");

  const todayStr = analyticsService.getTodayDateString();
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(todayStr),
    "Date Formatter: Generates valid ISO YYYY-MM-DD date string",
  );

  // Record initial daily snapshot
  const snapshot1 = await analyticsService.recordDailySnapshot(testGuildId, {
    date: todayStr,
    messages: 120,
    voiceMinutes: 200,
    joins: 8,
    leaves: 1,
    infractions: 2,
    ticketsOpened: 3,
    ticketsClosed: 1,
  });

  assert(
    snapshot1.messageCount === 120 && snapshot1.voiceMinutes === 200 && snapshot1.joins === 8,
    "Record Snapshot: Daily metric created with correct message and voice counts",
  );

  // Increment snapshot
  const snapshot2 = await analyticsService.recordDailySnapshot(testGuildId, {
    date: todayStr,
    messages: 30,
    voiceMinutes: 50,
    joins: 2,
  });

  assert(
    snapshot2.messageCount === 150 && snapshot2.voiceMinutes === 250 && snapshot2.joins === 10,
    "Increment Snapshot: Incremental updates properly accumulated via atomic increment",
  );

  // Populate historical days for moving average testing
  for (let i = 1; i <= 6; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];

    await analyticsService.recordDailySnapshot(testGuildId, {
      date: dateStr,
      messages: 50 + i * 5, // 55, 60, 65, 70, 75, 80 (avg ~ 67)
      voiceMinutes: 100,
      joins: 2,
      leaves: 1,
    });
  }

  const historical = await analyticsService.getHistoricalMetrics(testGuildId, 7);
  assert(
    historical.length >= 7,
    `Historical Metrics: Retrieved ${historical.length} days of recorded metrics`,
  );

  // Activity summary
  const summary = await analyticsService.getActivitySummary(testGuildId);
  assert(summary.totalMembers === 3, "Activity Summary: Total member count verified (3)");
  assert(
    summary.activeLast24h === 2 && summary.activeLast7d === 2,
    "Activity Summary: Active members in last 24h & 7d correctly calculated (2)",
  );
  assert(
    summary.totalMessages === 195,
    "Activity Summary: Total messages correctly aggregated (150 + 40 + 5 = 195)",
  );
  assert(
    summary.totalVoiceMinutes === 510,
    "Activity Summary: Total voice minutes correctly aggregated (180 + 320 + 10 = 510)",
  );
  assert(
    summary.topChatters[0]?.userId === testUser1 && summary.topChatters[0]?.messageCount === 150,
    "Activity Summary: Top chatter rank 1 correctly identified as NexusLead",
  );
  assert(
    summary.topVoiceUsers[0]?.userId === testUser2 && summary.topVoiceUsers[0]?.voiceMinutes === 320,
    "Activity Summary: Top voice user rank 1 correctly identified as VoiceKing",
  );
  assert(
    summary.engagementScore > 0 && summary.engagementScore <= 100,
    `Activity Summary: Engagement score computed within valid range (${summary.engagementScore} / 100)`,
  );

  // ── TEST GROUP 2: Velocity & Anomaly Detection ──────────
  console.log("\n▶ Group 2: Retention, Velocity & Anomaly Detection");

  const velocity = await analyticsService.getRetentionAndVelocity(testGuildId, 7);
  assert(
    velocity.totalJoins > 0 && velocity.movingAverages.dailyMessages > 0,
    `Velocity Aggregator: Calculated moving average (${velocity.movingAverages.dailyMessages} msgs/day)`,
  );

  assert(
    velocity.anomalies.length > 0,
    "Anomaly Detector: Detected activity anomaly due to today's high message volume vs 7-day average",
  );

  const messageAnomaly = velocity.anomalies.find((a) => a.metric === "messageCount");
  assert(
    messageAnomaly !== undefined && messageAnomaly.type === "spike",
    "Anomaly Detector: Correctly classified message spike anomaly (+100% above moving average)",
  );

  const joinAnomaly = velocity.anomalies.find((a) => a.metric === "joins");
  assert(
    joinAnomaly !== undefined && joinAnomaly.severity === "alert",
    "Anti-Raid Anomaly: High join velocity flagged as raid warning alert (≥ 10 joins)",
  );

  // ── TEST GROUP 3: Hardware & System Telemetry ───────────
  console.log("\n▶ Group 3: System & Hardware Telemetry (HP All-in-One 4GB Monitor)");

  const telemetry = await analyticsService.getSystemTelemetry();

  assert(
    telemetry.botVersion === BOT_VERSION,
    `Telemetry: Bot version matches current release (${telemetry.botVersion})`,
  );
  assert(
    telemetry.process.memory.rssMb > 0,
    `Telemetry: Process RSS memory measured (${telemetry.process.memory.rssMb} MB)`,
  );
  assert(
    telemetry.process.memory.rssMb < 350,
    "Telemetry Budget Guard: Process RSS comfortably within 350MB budget for 4GB host",
  );
  assert(
    telemetry.system.totalRamMb > 0 && telemetry.system.freeRamMb > 0,
    `Telemetry: Host total RAM (${telemetry.system.totalRamMb} MB) and free headroom (${telemetry.system.freeRamMb} MB) available`,
  );
  assert(
    telemetry.system.ramUsagePercent >= 0 && telemetry.system.ramUsagePercent <= 100,
    `Telemetry: RAM percentage calculated properly (${telemetry.system.ramUsagePercent}%)`,
  );
  assert(
    telemetry.database.engine === "SQLite (WAL mode)",
    "Telemetry: Database engine reported as SQLite in WAL mode",
  );

  // Export JSON summary
  const exportData: any = await analyticsService.exportAnalyticsJson(testGuildId);
  assert(
    exportData.guild?.id === testGuildId &&
      exportData.summary?.totalMembers === 3 &&
      exportData.systemTelemetry !== undefined,
    "Export Engine: Complete JSON analytics bundle generated with guild metadata and telemetry",
  );

  // ── TEST GROUP 4: Module & Slash Command Metadata ───────
  console.log("\n▶ Group 4: Module Lifecycle & Slash Command Registration");

  assert(analyticsModule.name === "analytics", "Module Definition: Module identifier is 'analytics'");
  assert(
    analyticsModule.commands.includes(analyticsCommand),
    "Module Definition: analyticsCommand registered in module command array",
  );

  const health = await analyticsModule.healthCheck();
  assert(
    health.status === "healthy" || health.status === "degraded",
    `Health Check: Module reports operational status '${health.status}'`,
  );

  const subcommands = (analyticsCommand.data as any).options.map((opt: any) => opt.name);
  assert(
    subcommands.includes("stats") &&
      subcommands.includes("system") &&
      subcommands.includes("top") &&
      subcommands.includes("export"),
    "Slash Command: All 4 subcommands (stats, system, top, export) registered",
  );

  // ── TEST GROUP 5: Standalone Web Dashboard Server ────────
  console.log("\n▶ Group 5: Standalone Web Dashboard HTTP Server");

  const testPort = 3088;
  const testSecret = "nexus-test-token-777";
  process.env.DASHBOARD_AUTH_TOKEN = testSecret;

  const dashboardServer = new DashboardServer({
    port: testPort,
    host: "127.0.0.1",
    secret: testSecret,
  });
  await dashboardServer.start();

  try {
    // 1. Health endpoint
    const healthRes = await makeRequest("/api/health", { port: testPort });
    assert(
      healthRes.statusCode === 200 && healthRes.body.status === "ok",
      "Dashboard HTTP: GET /api/health returns 200 OK with status: 'ok'",
    );

    // 2. Global stats endpoint
    const statsRes = await makeRequest("/api/stats", { port: testPort });
    assert(
      statsRes.statusCode === 200 && statsRes.body.totalMembers >= 3,
      `Dashboard HTTP: GET /api/stats returns 200 OK (totalMembers: ${statsRes.body.totalMembers})`,
    );

    // 3. System hardware telemetry endpoint
    const systemRes = await makeRequest("/api/system", { port: testPort });
    assert(
      systemRes.statusCode === 200 &&
        systemRes.body.system?.totalRamMb > 0 &&
        systemRes.body.process?.memory?.rssMb > 0,
      "Dashboard HTTP: GET /api/system returns live host RAM and CPU metrics",
    );

    // 4. Analytics endpoint
    const analyticsRes = await makeRequest(`/api/analytics?guildId=${testGuildId}&days=7`, {
      port: testPort,
    });
    assert(
      analyticsRes.statusCode === 200 && analyticsRes.body.summary?.totalMembers === 3,
      "Dashboard HTTP: GET /api/analytics returns 200 OK with 7-day velocity and summary",
    );

    // 5. Moderation endpoint
    await prisma.infraction.create({
      data: {
        guildId: testGuildId,
        userId: testUser3,
        moderatorId: testUser1,
        type: "warn",
        reason: "Spamming attachments",
      },
    });

    const modRes = await makeRequest(`/api/moderation?guildId=${testGuildId}`, { port: testPort });
    assert(
      modRes.statusCode === 200 && modRes.body.infractions.length >= 1,
      "Dashboard HTTP: GET /api/moderation returns recent infraction logs",
    );

    // 6. Tickets endpoint
    await prisma.supportTicket.create({
      data: {
        ticketNumber: 7001,
        guildId: testGuildId,
        creatorId: testUser2,
        creatorUsername: "VoiceKing",
        subject: "Help with voice channel permissions",
        category: "general",
        status: "open",
      },
    });

    const ticketsRes = await makeRequest(`/api/tickets?guildId=${testGuildId}`, { port: testPort });
    assert(
      ticketsRes.statusCode === 200 && ticketsRes.body.tickets.length >= 1,
      "Dashboard HTTP: GET /api/tickets returns active support tickets",
    );

    // 7. Modules list endpoint
    const modulesRes = await makeRequest(`/api/modules?guildId=${testGuildId}`, { port: testPort });
    assert(
      modulesRes.statusCode === 200 && Array.isArray(modulesRes.body.modules),
      `Dashboard HTTP: GET /api/modules returns ${modulesRes.body.modules.length} feature modules`,
    );

    // 8. Auth verification endpoint
    const badLoginRes = await makeRequest("/api/auth/login", {
      port: testPort,
      method: "POST",
      body: { token: "invalid-token" },
    });
    assert(
      badLoginRes.statusCode === 401 && badLoginRes.body.authorized === false,
      "Dashboard Security: POST /api/auth/login rejects incorrect token with 401 Unauthorized",
    );

    const goodLoginRes = await makeRequest("/api/auth/login", {
      port: testPort,
      method: "POST",
      body: { token: testSecret },
    });
    assert(
      goodLoginRes.statusCode === 200 && goodLoginRes.body.authorized === true,
      "Dashboard Security: POST /api/auth/login accepts valid token with 200 OK",
    );

    // 9. Protected module toggle endpoint (Unauthorized test)
    const unauthToggleRes = await makeRequest("/api/modules/toggle", {
      port: testPort,
      method: "POST",
      body: { guildId: testGuildId, module: "economy", enabled: true },
    });
    assert(
      unauthToggleRes.statusCode === 401,
      "Dashboard Security: POST /api/modules/toggle without auth rejected with 401",
    );

    // 10. Protected module toggle endpoint (Authorized test)
    const authToggleRes = await makeRequest("/api/modules/toggle", {
      port: testPort,
      method: "POST",
      headers: { Authorization: `Bearer ${testSecret}` },
      body: { guildId: testGuildId, module: "economy", enabled: true },
    });
    assert(
      authToggleRes.statusCode === 200 && authToggleRes.body.success === true,
      "Dashboard Security: POST /api/modules/toggle with Bearer token succeeds with 200 OK",
    );

    // Verify DB persistence of toggle
    const updatedModule = await prisma.moduleConfig.findUnique({
      where: { guildId_module: { guildId: testGuildId, module: "economy" } },
    });
    assert(
      updatedModule?.enabled === true,
      "Dashboard Persistence: Module toggle state successfully stored in SQLite moduleConfig",
    );

    // 11. Static SPA frontend delivery
    const spaRes = await makeRequest("/", { port: testPort });
    assert(
      spaRes.statusCode === 200 &&
        spaRes.headers["content-type"]?.includes("text/html") &&
        spaRes.rawBody.includes("NEXUS AI"),
      "Dashboard Frontend: GET / serves index.html single-page app with text/html content-type",
    );
  } finally {
    // Graceful server shutdown
    await dashboardServer.stop();
  }

  // Cleanup test records
  await prisma.dailyMetric.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.moduleConfig.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.supportTicket.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
  await prisma.infraction.deleteMany({ where: { guildId: testGuildId } }).catch(() => null);
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
