/**
 * Automated Moderation Message Event Handler for NEXUS AI.
 * Inspects chat messages against anti-spam, phishing, duplicate,
 * and filtered word engines.
 */

import { Message, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { automodService } from "../services/automod.service.js";
import { punishmentService } from "../services/punishment.service.js";
import { Colors } from "../../../utils/embeds.js";
import { type NexusEvent } from "../../../types/index.js";
import { MODERATION } from "../../../config/features.js";

export const automodMessageEvent: NexusEvent<"messageCreate"> = {
  name: "messageCreate",
  once: false,
  module: MODERATION,
  async execute(message: Message): Promise<void> {
    if (!message.guild || message.author.bot) return;

    // Ignore members with Administrator or ManageMessages permissions
    if (
      message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
      message.member?.permissions.has(PermissionFlagsBits.ManageMessages)
    ) {
      return;
    }

    const totalMentions = message.mentions.users.size + message.mentions.roles.size;
    const analysis = await automodService.analyzeMessage(
      message.guild.id,
      message.author.id,
      message.content,
      totalMentions,
    );

    if (!analysis.flagged) return;

    // Delete offending message immediately
    await message.delete().catch(() => null);

    // Apply infraction based on recommended action
    const reason = `[Automod: ${analysis.violationType}] ${analysis.reason}`;
    const { escalation } = await punishmentService.recordInfraction(
      message.guild.id,
      message.author.id,
      message.client.user?.id || "NEXUS-AUTOMOD",
      analysis.recommendedAction === "timeout" ? "timeout" : "warn",
      reason,
      analysis.recommendedAction === "timeout" ? 10 : undefined,
    );

    // If timeout recommended or escalation triggered, apply timeout if bot has permissions
    if (
      (analysis.recommendedAction === "timeout" || escalation.action === "timeout") &&
      message.member?.moderatable
    ) {
      const duration = escalation.durationMinutes || 10;
      await message.member.timeout(duration * 60 * 1000, reason).catch(() => null);
    }

    // Send warning notification in channel with auto-delete after 8 seconds
    const warningEmbed = new EmbedBuilder()
      .setColor(Colors.ERROR)
      .setTitle("🛡️ Message Removed by NEXUS Automod")
      .setDescription(
        `**Member:** <@${message.author.id}>\n` +
          `**Violation:** ${analysis.violationType?.toUpperCase()}\n` +
          `**Reason:** ${analysis.reason}\n` +
          `**Confidence:** ${Math.round(analysis.confidence * 100)}%\n\n` +
          (escalation.action === "timeout"
            ? `🚨 **Escalation:** Member has been placed in timeout (${escalation.durationMinutes}m).`
            : `⚠️ **Warning:** Please adhere to community guidelines to prevent timeouts.`),
      )
      .setFooter({ text: "NEXUS AI Moderation Subsystem" });

    if ("send" in message.channel) {
      const warnMsg = await message.channel.send({ embeds: [warningEmbed] }).catch(() => null);
      if (warnMsg) {
        setTimeout(() => {
          warnMsg.delete().catch(() => null);
        }, 8000);
      }
    }
  },
};
