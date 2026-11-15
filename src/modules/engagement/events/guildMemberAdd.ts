/**
 * NEXUS AI — Guild Member Add Event (Engagement Module)
 * Welcomes new members and initializes their profile.
 */

import { Events } from "discord.js";
import { memberRepository } from "../../../database/index.js";
import { createModuleLogger } from "../../../utils/logger.js";

const log = createModuleLogger("engagement:guildMemberAdd");

export const name = Events.GuildMemberAdd;
export const once = false;

export async function execute(member: import("discord.js").GuildMember): Promise<void> {
  // Initialize member record
  await memberRepository.findOrCreate({ guildId: member.guild.id, userId: member.id, username: member.user.username });

  log.info({ guildId: member.guild.id, userId: member.id }, "New member joined, profile initialized");

  // Could send welcome DM or post in welcome channel here
  // For now, just log and ensure profile exists
}