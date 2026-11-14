/**
 * Power & Battery Lifecycle Guard Service for NEXUS AI.
 * Optimizes resource consumption on mobile hosts (OPPO Reno10 5G / Android Termux).
 * Provides wake-lock controls, battery monitoring, and automatic Eco Mode throttling.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import { config, isAndroid, isAndroidLightweight } from "../../../config/index.js";
import { createModuleLogger } from "../../../utils/logger.js";
const logger = createModuleLogger("service:power-guard");
export class PowerGuardService {
    ecoModeActive = false;
    ecoModeReason = "Normal operation";
    wakeLockHeld = false;
    simulatedBattery = null;
    lastBatteryCheck = 0;
    cachedBattery = null;
    constructor() {
        // If Android Termux is detected on startup, acquire wake-lock
        if (this.isTermuxEnvironment()) {
            this.acquireWakeLock();
        }
    }
    /**
     * Detects if the current runtime is running inside an Android Termux environment.
     */
    isTermuxEnvironment() {
        return (isAndroid ||
            process.env.TERMUX_VERSION !== undefined ||
            process.env.PREFIX?.includes("com.termux") === true ||
            fs.existsSync("/data/data/com.termux"));
    }
    /**
     * Retrieves the current device battery status.
     * Uses Termux API if present, otherwise returns simulated or default healthy status.
     */
    getBatteryStatus() {
        if (this.simulatedBattery) {
            return this.simulatedBattery;
        }
        // Cache battery status for 15 seconds to prevent spamming shell processes
        const now = Date.now();
        if (this.cachedBattery && now - this.lastBatteryCheck < 15_000) {
            return this.cachedBattery;
        }
        if (this.isTermuxEnvironment()) {
            try {
                const output = execSync("termux-battery-status", {
                    encoding: "utf-8",
                    timeout: 2000,
                    stdio: ["ignore", "pipe", "ignore"],
                });
                const parsed = JSON.parse(output.trim());
                const status = {
                    health: parsed.health || "GOOD",
                    percentage: typeof parsed.percentage === "number" ? parsed.percentage : 100,
                    plugged: parsed.plugged || "UNPLUGGED",
                    status: parsed.status || "DISCHARGING",
                    temperature: typeof parsed.temperature === "number" ? parsed.temperature : 30.0,
                };
                this.cachedBattery = status;
                this.lastBatteryCheck = now;
                this.evaluateBatteryThresholds(status);
                return status;
            }
            catch {
                // termux-api pkg might not be installed or permission missing
            }
        }
        // Default safe baseline for non-mobile or un-instrumented hosts
        const defaultStatus = {
            health: "GOOD",
            percentage: 100,
            plugged: "AC",
            status: "CHARGING",
            temperature: 28.5,
        };
        this.cachedBattery = defaultStatus;
        this.lastBatteryCheck = now;
        return defaultStatus;
    }
    /**
     * Evaluates battery health and level to determine if Eco Mode should activate automatically.
     */
    evaluateBatteryThresholds(battery) {
        if (!config.android.batteryGuard)
            return false;
        // 1. Critical Battery threshold (≤ 15% and unplugged)
        if (battery.percentage <= 15 && battery.plugged === "UNPLUGGED") {
            if (!this.ecoModeActive) {
                this.setEcoMode(true, `Critical low battery (${battery.percentage}%)`);
            }
            return true;
        }
        // 2. Thermal threshold (> 42°C)
        if (battery.temperature >= 42.0) {
            if (!this.ecoModeActive) {
                this.setEcoMode(true, `Thermal throttle guard (${battery.temperature}°C)`);
            }
            return true;
        }
        // 3. Recovery threshold (Charged > 30% or plugged in)
        if (this.ecoModeActive && (battery.percentage > 30 || battery.plugged !== "UNPLUGGED")) {
            if (this.ecoModeReason.includes("battery") || this.ecoModeReason.includes("Thermal")) {
                this.setEcoMode(false, "Battery recovered / plugged in");
            }
        }
        return this.ecoModeActive;
    }
    /**
     * Toggles Eco Mode profile.
     */
    setEcoMode(enabled, reason = "Manual configuration") {
        const previous = this.ecoModeActive;
        this.ecoModeActive = enabled;
        this.ecoModeReason = reason;
        if (previous !== enabled) {
            if (enabled) {
                logger.warn({ reason }, "⚡ Mobile Eco Mode ACTIVATED: Throttling background tasks and downsizing caches");
            }
            else {
                logger.info({ reason }, "✨ Mobile Eco Mode DEACTIVATED: Restored normal background processing");
            }
        }
    }
    isEcoModeActive() {
        return this.ecoModeActive;
    }
    getEcoModeReason() {
        return this.ecoModeReason;
    }
    /**
     * Acquires Termux CPU wake lock to prevent deep sleep while bot process runs.
     */
    acquireWakeLock() {
        if (this.isTermuxEnvironment()) {
            try {
                execSync("termux-wake-lock", { stdio: "ignore", timeout: 2000 });
                this.wakeLockHeld = true;
                logger.info("Acquired Termux CPU wake lock.");
                return true;
            }
            catch {
                logger.warn("Could not acquire Termux wake lock (termux-api might be missing)");
            }
        }
        this.wakeLockHeld = true; // Flag active for simulation
        return true;
    }
    /**
     * Releases Termux CPU wake lock.
     */
    releaseWakeLock() {
        if (this.isTermuxEnvironment()) {
            try {
                execSync("termux-wake-unlock", { stdio: "ignore", timeout: 2000 });
                this.wakeLockHeld = false;
                logger.info("Released Termux CPU wake lock.");
                return true;
            }
            catch { }
        }
        this.wakeLockHeld = false;
        return true;
    }
    hasWakeLock() {
        return this.wakeLockHeld;
    }
    /**
     * Sets simulated battery status for verification and automated tests.
     */
    setSimulatedBattery(status) {
        this.simulatedBattery = status;
        if (status) {
            this.evaluateBatteryThresholds(status);
        }
    }
    /**
     * Returns comprehensive mobile diagnostics.
     */
    getMobileTelemetry() {
        const battery = this.getBatteryStatus();
        const rss = process.memoryUsage().rss / (1024 * 1024);
        const targetBudget = isAndroid ? 120 : 350;
        return {
            isAndroid: this.isTermuxEnvironment(),
            deploymentMode: config.deploymentMode,
            voiceProfile: isAndroidLightweight ? "lightweight" : "advanced",
            isEcoMode: this.ecoModeActive,
            ecoModeReason: this.ecoModeReason,
            battery,
            wakeLockActive: this.wakeLockHeld,
            targetMemoryBudgetMb: targetBudget,
            currentRssMb: Math.round(rss * 100) / 100,
            withinBudget: rss <= targetBudget,
            timestamp: new Date().toISOString(),
        };
    }
}
export const powerGuardService = new PowerGuardService();
//# sourceMappingURL=power-guard.service.js.map