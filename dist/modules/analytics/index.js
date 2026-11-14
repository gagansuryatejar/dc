/**
 * Analytics Module definition for NEXUS AI.
 * Handles community engagement tracking, velocity, anomalies, and host hardware telemetry.
 */
import { ANALYTICS } from "../../config/features.js";
import { createModuleLogger } from "../../utils/logger.js";
import { analyticsCommand } from "./commands/analytics.js";
import { analyticsService } from "./services/analytics.service.js";
const logger = createModuleLogger("module:analytics");
export class AnalyticsModule {
    name = ANALYTICS;
    version = "1.0.0";
    description = "Community engagement metrics, message velocity, retention graphs, and hardware telemetry";
    commands = [analyticsCommand];
    events = [];
    async onLoad() {
        logger.info("Initializing Community Analytics Subsystem...");
    }
    async onUnload() {
        logger.info("Analytics Subsystem unloaded.");
    }
    async onEnable() {
        logger.info("Analytics Subsystem enabled.");
    }
    async onDisable() {
        logger.info("Analytics Subsystem disabled.");
    }
    async healthCheck() {
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
//# sourceMappingURL=index.js.map