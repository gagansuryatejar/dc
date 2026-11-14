/**
 * Analytics Module definition for NEXUS AI.
 * Handles community engagement tracking, velocity, anomalies, and host hardware telemetry.
 */
import type { NexusModule, ModuleHealth } from "../../types/index.js";
export declare class AnalyticsModule implements NexusModule {
    readonly name: "analytics";
    readonly version = "1.0.0";
    readonly description = "Community engagement metrics, message velocity, retention graphs, and hardware telemetry";
    readonly commands: import("../../types/index.js").NexusCommand[];
    readonly events: never[];
    onLoad(): Promise<void>;
    onUnload(): Promise<void>;
    onEnable(): Promise<void>;
    onDisable(): Promise<void>;
    healthCheck(): Promise<ModuleHealth>;
}
export declare const analyticsModule: AnalyticsModule;
