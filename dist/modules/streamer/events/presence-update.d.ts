/**
 * Presence Update Event Handler for Streamer Subsystem.
 * Detects Discord Go Live and external streaming status changes (Twitch, YouTube, Kick).
 */
import type { NexusEvent } from "../../../types/index.js";
export declare const streamPresenceEvent: NexusEvent<"presenceUpdate">;
