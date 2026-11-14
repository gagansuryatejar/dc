/**
 * Power & Battery Lifecycle Guard Service for NEXUS AI.
 * Optimizes resource consumption on mobile hosts (OPPO Reno10 5G / Android Termux).
 * Provides wake-lock controls, battery monitoring, and automatic Eco Mode throttling.
 */
export interface BatteryStatus {
    health: "GOOD" | "OVERHEAT" | "DEAD" | "OVER_VOLTAGE" | "UNSPECIFIED_FAILURE" | "COLD" | "UNKNOWN";
    percentage: number;
    plugged: "AC" | "USB" | "WIRELESS" | "UNPLUGGED";
    status: "CHARGING" | "DISCHARGING" | "FULL" | "NOT_CHARGING" | "UNKNOWN";
    temperature: number;
}
export interface MobileTelemetry {
    isAndroid: boolean;
    deploymentMode: string;
    voiceProfile: "lightweight" | "advanced";
    isEcoMode: boolean;
    ecoModeReason: string;
    battery: BatteryStatus;
    wakeLockActive: boolean;
    targetMemoryBudgetMb: number;
    currentRssMb: number;
    withinBudget: boolean;
    timestamp: string;
}
export declare class PowerGuardService {
    private ecoModeActive;
    private ecoModeReason;
    private wakeLockHeld;
    private simulatedBattery;
    private lastBatteryCheck;
    private cachedBattery;
    constructor();
    /**
     * Detects if the current runtime is running inside an Android Termux environment.
     */
    isTermuxEnvironment(): boolean;
    /**
     * Retrieves the current device battery status.
     * Uses Termux API if present, otherwise returns simulated or default healthy status.
     */
    getBatteryStatus(): BatteryStatus;
    /**
     * Evaluates battery health and level to determine if Eco Mode should activate automatically.
     */
    evaluateBatteryThresholds(battery: BatteryStatus): boolean;
    /**
     * Toggles Eco Mode profile.
     */
    setEcoMode(enabled: boolean, reason?: string): void;
    isEcoModeActive(): boolean;
    getEcoModeReason(): string;
    /**
     * Acquires Termux CPU wake lock to prevent deep sleep while bot process runs.
     */
    acquireWakeLock(): boolean;
    /**
     * Releases Termux CPU wake lock.
     */
    releaseWakeLock(): boolean;
    hasWakeLock(): boolean;
    /**
     * Sets simulated battery status for verification and automated tests.
     */
    setSimulatedBattery(status: BatteryStatus | null): void;
    /**
     * Returns comprehensive mobile diagnostics.
     */
    getMobileTelemetry(): MobileTelemetry;
}
export declare const powerGuardService: PowerGuardService;
