/**
 * InteractionCreate event handler.
 * Dispatches slash commands, autocomplete, and component interactions (buttons, selects, modals).
 */
import { Events } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
export declare const interactionCreateEvent: NexusEvent<Events.InteractionCreate>;
