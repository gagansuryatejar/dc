/**
 * Standalone Web Dashboard Server for NEXUS AI.
 * Ultra-lightweight HTTP server optimized for the HP All-in-One 4GB RAM environment.
 * Operates independently of the Discord bot process.
 */
import http from "node:http";
export interface DashboardServerOptions {
    port?: number;
    host?: string;
    secret?: string;
}
export declare class DashboardServer {
    private server;
    private port;
    private host;
    private secret;
    constructor(options?: DashboardServerOptions);
    getSecret(): string;
    getPort(): number;
    /**
     * Validates if a request contains a valid admin authorization token.
     */
    isAuthorized(req: http.IncomingMessage): boolean;
    /**
     * Helper to parse incoming JSON request bodies safely with size limit.
     */
    private parseJsonBody;
    /**
     * Sends a JSON response with CORS headers.
     */
    private sendJson;
    /**
     * Sends error responses.
     */
    private sendError;
    /**
     * Core request dispatcher.
     */
    private handleRequest;
    /**
     * Starts the dashboard HTTP server.
     */
    start(): Promise<void>;
    /**
     * Shuts down the dashboard HTTP server gracefully.
     */
    stop(): Promise<void>;
}
