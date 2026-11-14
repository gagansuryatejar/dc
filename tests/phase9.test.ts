/**
 * Automated Verification Suite for NEXUS AI — Phase 9.
 * Tests Android Termux Optimizations & Deployment Profile:
 * 1. Android Dual-Mode Profile (Lightweight vs Advanced Voice, Audio receive bypass)
 * 2. Power & Battery Lifecycle Guard (Thresholds, low-battery triggers, thermal guards)
 * 3. Eco Mode Auto-Throttling & Recovery
 * 4. Wake-Lock Management (CPU sleep prevention)
 * 5. Mobile Telemetry & Memory Budgeting (Target ≤ 120MB RSS)
 * 6. Slash Command Integration (/nexus mobile, /nexus ecomode)
 * 7. Termux Deployment Scripts Verification
 */

import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { connectDatabase, disconnectDatabase } from "../src/database/index.js";
import { powerGuardService, type BatteryStatus } from "../src/modules/core/services/power-guard.service.js";
import { voiceAssistantService } from "../src/modules/voice/services/voice-assistant.service.js";
import { nexusCommand } from "../src/modules/core/commands/nexus.js";

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
  console.log("⚡ NEXUS AI — Phase 9 Automated Test Suite");
  console.log("Target: OPPO Reno10 5G / Android Termux Deployment");
  console.log("====================================================\n");

  await connectDatabase();

  // ── TEST GROUP 1: Android Dual-Mode & Voice Bypass ───────
  console.log("▶ Group 1: Android Dual-Mode & Audio Receive Bypass");

  const isBypassed = voiceAssistantService.isAudioBypassed();
  assert(
    typeof isBypassed === "boolean",
    "Audio Bypass Check: voiceAssistantService.isAudioBypassed() returns boolean flag",
  );

  // Audio advice continues to generate clean recommendations regardless of mode
  const mockChannel: any = {
    guild: { id: "test-guild" },
    bitrate: 64000,
  };
  const advice = voiceAssistantService.getAudioOptimizationAdvice(mockChannel);
  assert(
    advice.bitrateKbps === 64 && advice.krispAdvice.length > 10,
    "Voice Intelligence: Audio advice generation operational without native C++ bindings",
  );

  // ── TEST GROUP 2: Power & Battery Lifecycle Guard ────────
  console.log("\n▶ Group 2: Power & Battery Lifecycle Guard Engine");

  // Healthy battery state
  const healthyBattery: BatteryStatus = {
    health: "GOOD",
    percentage: 85,
    plugged: "UNPLUGGED",
    status: "DISCHARGING",
    temperature: 31.0,
  };
  powerGuardService.setSimulatedBattery(healthyBattery);
  powerGuardService.setEcoMode(false, "Reset test state");

  assert(
    powerGuardService.isEcoModeActive() === false,
    "Battery Normal: Eco Mode remains inactive on healthy battery (85%)",
  );

  // Critical low battery trigger (≤ 15% and unplugged)
  const criticalBattery: BatteryStatus = {
    health: "GOOD",
    percentage: 12,
    plugged: "UNPLUGGED",
    status: "DISCHARGING",
    temperature: 32.5,
  };
  powerGuardService.setSimulatedBattery(criticalBattery);

  assert(
    powerGuardService.isEcoModeActive() === true,
    "Low Battery Guard: Eco Mode automatically ACTIVATED at 12% battery",
  );
  assert(
    powerGuardService.getEcoModeReason().includes("battery"),
    `Low Battery Reason: Reason correctly reported ('${powerGuardService.getEcoModeReason()}')`,
  );

  // Thermal throttle guard trigger (> 42.0°C)
  powerGuardService.setEcoMode(false, "Reset");
  const overheatBattery: BatteryStatus = {
    health: "OVERHEAT",
    percentage: 60,
    plugged: "AC",
    status: "CHARGING",
    temperature: 44.5,
  };
  powerGuardService.setSimulatedBattery(overheatBattery);

  assert(
    powerGuardService.isEcoModeActive() === true,
    "Thermal Guard: Eco Mode automatically ACTIVATED on device overheat (44.5°C)",
  );
  assert(
    powerGuardService.getEcoModeReason().includes("Thermal"),
    `Thermal Reason: Reason correctly reported ('${powerGuardService.getEcoModeReason()}')`,
  );

  // Battery recovery trigger (Charged > 30% or plugged in)
  const recoveredBattery: BatteryStatus = {
    health: "GOOD",
    percentage: 45,
    plugged: "AC",
    status: "CHARGING",
    temperature: 30.5,
  };
  powerGuardService.setSimulatedBattery(recoveredBattery);

  assert(
    powerGuardService.isEcoModeActive() === false,
    "Battery Recovery: Eco Mode automatically DEACTIVATED after charging/cooling down",
  );

  // Manual toggle test
  powerGuardService.setEcoMode(true, "Manual administrative test");
  assert(powerGuardService.isEcoModeActive() === true, "Manual Toggle: Manually engaged Eco Mode");
  powerGuardService.setEcoMode(false, "Manual administrative restore");
  assert(powerGuardService.isEcoModeActive() === false, "Manual Toggle: Manually disengaged Eco Mode");

  // ── TEST GROUP 3: Wake-Lock Management ───────────────────
  console.log("\n▶ Group 3: Termux Wake-Lock Management");

  powerGuardService.acquireWakeLock();
  assert(
    powerGuardService.hasWakeLock() === true,
    "Wake-Lock: Successfully acquired wake-lock flag to prevent CPU sleep",
  );

  powerGuardService.releaseWakeLock();
  assert(
    powerGuardService.hasWakeLock() === false,
    "Wake-Lock: Successfully released wake-lock flag",
  );

  // Reset simulated battery
  powerGuardService.setSimulatedBattery(null);

  // ── TEST GROUP 4: Mobile Telemetry & Budgeting ───────────
  console.log("\n▶ Group 4: Mobile Telemetry & Memory Budgeting");

  const telemetry = powerGuardService.getMobileTelemetry();
  assert(
    telemetry.battery !== undefined && typeof telemetry.battery.percentage === "number",
    `Mobile Telemetry: Battery telemetry available (${telemetry.battery.percentage}%)`,
  );
  assert(
    telemetry.targetMemoryBudgetMb > 0,
    `Memory Budget: Configured target limit (${telemetry.targetMemoryBudgetMb} MB RSS)`,
  );
  assert(
    telemetry.currentRssMb > 0,
    `Memory Meter: Current process RSS measured (${telemetry.currentRssMb} MB)`,
  );
  assert(
    typeof telemetry.withinBudget === "boolean",
    "Budget Guard: Budget compliance flag evaluated cleanly",
  );

  // ── TEST GROUP 5: Slash Command Subcommands ──────────────
  console.log("\n▶ Group 5: Slash Command Subcommands (/nexus mobile & ecomode)");

  const subcommands = (nexusCommand.data as any).options.map((opt: any) => opt.name);
  assert(
    subcommands.includes("mobile"),
    "Nexus Command: '/nexus mobile' subcommand registered",
  );
  assert(
    subcommands.includes("ecomode"),
    "Nexus Command: '/nexus ecomode' subcommand registered",
  );

  // ── TEST GROUP 6: Termux Deployment Scripts Validation ────
  console.log("\n▶ Group 6: Termux Deployment Scripts Validation");

  const setupScript = path.resolve(process.cwd(), "scripts/termux/setup.sh");
  const startScript = path.resolve(process.cwd(), "scripts/termux/start.sh");
  const ecoScript = path.resolve(process.cwd(), "scripts/termux/eco-mode.sh");

  assert(
    fs.existsSync(setupScript),
    "Script Verification: scripts/termux/setup.sh exists on disk",
  );
  assert(
    fs.existsSync(startScript),
    "Script Verification: scripts/termux/start.sh exists on disk",
  );
  assert(
    fs.existsSync(ecoScript),
    "Script Verification: scripts/termux/eco-mode.sh exists on disk",
  );

  const startContent = fs.readFileSync(startScript, "utf-8");
  assert(
    startContent.includes("termux-wake-lock") &&
      startContent.includes("DEPLOYMENT_MODE=\"android\""),
    "Start Script: Configures Termux wake-lock and Android deployment mode",
  );

  const setupContent = fs.readFileSync(setupScript, "utf-8");
  assert(
    setupContent.includes("nodejs-lts") && setupContent.includes("termux-api"),
    "Setup Script: Installs nodejs-lts and termux-api packages",
  );

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
