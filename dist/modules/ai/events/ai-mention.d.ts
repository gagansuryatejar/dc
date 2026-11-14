/**
 * MessageCreate event listener for direct bot mentions and conversation triggers.
 * Automatically replies when members ping @NEXUS AI or reply to its messages.
 */
import { Events } from "discord.js";
import type { NexusEvent } from "../../../types/index.js";
export declare const aiMentionEvent: NexusEvent<Events.MessageCreate>;
