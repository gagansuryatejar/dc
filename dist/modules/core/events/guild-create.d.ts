/**
 * GuildCreate event handler.
 * Executed when the bot joins a new server or when a guild becomes available.
 */
import { Events } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
export declare const guildCreateEvent: NexusEvent<Events.GuildCreate>;
