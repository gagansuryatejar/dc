/**
 * Deployment modes supported by NEXUS AI.
 * - `android`  — running on Termux / Android; native deps (voice) are disabled.
 * - `server`   — full-featured server deployment.
 */
export declare const DeploymentMode: {
    readonly ANDROID: "android";
    readonly SERVER: "server";
};
export type DeploymentMode = (typeof DeploymentMode)[keyof typeof DeploymentMode];
export declare const config: {
    readonly discord: {
        readonly token: string;
        readonly clientId: string;
        readonly clientSecret: string;
        readonly publicKey: string;
        readonly ownerId: string;
        readonly guildId: string;
    };
    readonly database: {
        readonly url: string;
    };
    readonly logLevel: "trace" | "debug" | "info" | "warn" | "error" | "fatal";
    readonly nodeEnv: "development" | "production" | "test";
    readonly isDev: boolean;
    readonly isProd: boolean;
    readonly isTest: boolean;
    readonly ai: {
        readonly provider: "gemini" | "openai" | "ollama";
        readonly geminiApiKey: string;
        readonly openaiApiKey: string;
        readonly ollamaUrl: string;
    };
    readonly dashboard: {
        readonly port: number;
        readonly secret: string;
    };
    readonly deploymentMode: DeploymentMode;
    readonly android: {
        readonly voiceMode: "lightweight" | "advanced";
        readonly batteryGuard: boolean;
    };
};
/** `true` when running in Android / Termux mode. */
export declare const isAndroid: boolean;
/** `true` when running in Android Lightweight Mode (voice audio receive bypassed). */
export declare const isAndroidLightweight: boolean;
