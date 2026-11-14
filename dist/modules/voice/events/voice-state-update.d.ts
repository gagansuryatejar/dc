/**
 * VoiceStateUpdate event handler.
 * Dispatches voice activity session tracking and triggers temporary room cleanup on member departures.
 */
import { Events } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
export declare const voiceStateUpdateEvent: NexusEvent<Events.VoiceStateUpdate>;
