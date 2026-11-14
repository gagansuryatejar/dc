/**
 * Automated Moderation Member Join Event Handler for NEXUS AI.
 * Scrutinizes new member joins for raid conditions and suspicious account age.
 */

import { GuildMember, EmbedBuilder, TextChannel } from "discord.js";
import { automodService } from "../services/automod.service.js";
import { guildRepository, auditRepository } from "../../../database/index.js";
import { Colors } from "../../../utils/embeds.js";
import { type NexusEvent } from "../../../types/index.js";
import { MODERATION } from "../../../config/features.js";

export const automodJoinEvent: NexusEvent<"guildMemberAdd"> = {
  name: "guildMemberAdd",
  once: false,
  module: MODERATION,
  async execute(member: GuildMember): Promise<void> {
    const analysis = automodService.analyzeJoin(
      member.guild.id,
      member.user.createdAt,
    );

    if (!analysis.isRaid && !analysis.isSuspiciousAccount) {
      return;
    }

    const guildSettings = await guildRepository.findById(member.guild.id);
    const logChannelId = guildSettings?.logChannel;

    await auditRepository.create(member.guild.id, analysis.isRaid ? "RAID_ALERT" : "SUSPICIOUS_ACCOUNT_ALERT", {
      userId: member.id,
      target: member.id,
      details: analysis.reason || "Suspicious join pattern",
      module: "moderation",
      severity: analysis.isRaid ? "critical" : "warning",
    });

    if (logChannelId) {
      const logChannel = member.guild.channels.cache.get(logChannelId) as TextChannel | undefined;
      if (logChannel) {
        const alertEmbed = new EmbedBuilder()
          .setColor(analysis.isRaid ? Colors.ERROR : Colors.WARNING)
          .setTitle(analysis.isRaid ? "🚨 RAID WAVE DETECTED" : "⚠️ Suspicious New Account Joined")
          .setDescription(
            `**Member:** <@${member.id}> (${member.user.tag})\n` +
              `**Account Created:** <t:${Math.floor(member.user.createdAt.getTime() / 1000)}:R> (${analysis.accountAgeHours} hours ago)\n` +
              `**Detection:** ${analysis.reason}\n\n` +
              (analysis.isRaid
                ? "🛡️ **Recommendation:** Check server verification level or run `/mod raidshield status:on`."
                : "👁️ **Recommendation:** Monitor this user for spam or bot behavior."),
          )
          .setFooter({ text: "NEXUS AI Security Watchdog" })
          .setTimestamp();

        await logChannel.send({ embeds: [alertEmbed] }).catch(() => null);
      }
    }
  },
};
