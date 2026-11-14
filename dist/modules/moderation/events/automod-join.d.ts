/**
 * Automated Moderation Member Join Event Handler for NEXUS AI.
 * Scrutinizes new member joins for raid conditions and suspicious account age.
 */
import { type NexusEvent } from "../../../types/index.js";
export declare const automodJoinEvent: NexusEvent<"guildMemberAdd">;
