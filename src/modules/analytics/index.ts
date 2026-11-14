/**
 * Analytics Module definition for NEXUS AI.
 * Handles community engagement tracking, velocity, anomalies, and host hardware telemetry.
 */

import { ANALYTICS } from "../../config/features.js";
import type { NexusModule, ModuleHealth } from "../../types/index.js";
import { createModuleLogger } from "../../utils/logger.js";
import { analyticsCommand } from "./commands/analytics.js";
import { analyticsService } from "./services/analytics.service.js";

const logger = createModuleLogger("module:analytics");

export class AnalyticsModule implements NexusModule {
  public readonly name = ANALYTICS;
  public readonly version = "1.0.0";
  public readonly description =
    "Community engagement metrics, message velocity, retention graphs, and hardware telemetry";

  public readonly commands = [analyticsCommand];
  public readonly events = [];

  async onLoad(): Promise<void> {
    logger.info("Initializing Community Analytics Subsystem...");
  }

  async onUnload(): Promise<void> {
    logger.info("Analytics Subsystem unloaded.");
  }

  async onEnable(): Promise<void> {
    logger.info("Analytics Subsystem enabled.");
  }

  async onDisable(): Promise<void> {
    logger.info("Analytics Subsystem disabled.");
  }

  async healthCheck(): Promise<ModuleHealth> {
    const telemetry = await analyticsService.getSystemTelemetry();
    const isRamWarning = telemetry.system.ramUsagePercent > 90;

    return {
      status: isRamWarning ? "degraded" : "healthy",
      message: `Analytics operational. Host RAM usage: ${telemetry.system.ramUsagePercent}%, Process RSS: ${telemetry.process.memory.rssMb}MB`,
      lastCheck: new Date(),
    };
  }
}

export const analyticsModule = new AnalyticsModule();
