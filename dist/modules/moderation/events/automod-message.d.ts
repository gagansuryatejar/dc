/**
 * Automated Moderation Message Event Handler for NEXUS AI.
 * Inspects chat messages against anti-spam, phishing, duplicate,
 * and filtered word engines.
 */
import { type NexusEvent } from "../../../types/index.js";
export declare const automodMessageEvent: NexusEvent<"messageCreate">;
