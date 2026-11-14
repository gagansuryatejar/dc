/**
 * GuildDelete event handler.
 * Executed when the bot is removed from a guild or a guild is deleted.
 */
import { Events } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
export declare const guildDeleteEvent: NexusEvent<Events.GuildDelete>;
