/**
 * ClientReady event handler.
 * Executed once upon successful authentication with Discord Gateway.
 */
import { Events } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
export declare const readyEvent: NexusEvent<Events.ClientReady>;
