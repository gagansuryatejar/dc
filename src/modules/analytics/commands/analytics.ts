/**
 * Analytics slash command for NEXUS AI.
 * Provides community health insights, engagement metrics, host telemetry, and JSON exports.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  AttachmentBuilder,
} from "discord.js";
import { type NexusCommand, PermissionLevel } from "../../../types/index.js";
import { ANALYTICS } from "../../../config/features.js";
import { analyticsService } from "../services/analytics.service.js";
import { createBaseEmbed, createErrorEmbed, Colors } from "../../../utils/embeds.js";
import { BOT_NAME } from "../../../utils/constants.js";

function renderProgressBar(percentage: number, length: number = 10): string {
  const clamped = Math.max(0, Math.min(100, percentage));
  const filled = Math.round((clamped / 100) * length);
  const empty = length - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${Math.round(clamped)}%`;
}

export const analyticsCommand: NexusCommand = {
  module: ANALYTICS,
  permissions: PermissionLevel.MEMBER,
  data: new SlashCommandBuilder()
    .setName("analytics")
    .setDescription("Community metrics, velocity graphs, and system diagnostics")
    .addSubcommand((sub) =>
      sub
        .setName("stats")
        .setDescription("View community health, engagement metrics, and activity velocity")
        .addIntegerOption((opt) =>
          opt
            .setName("days")
            .setDescription("Historical period in days (default: 7)")
            .setRequired(false)
            .addChoices(
              { name: "Last 7 Days", value: 7 },
              { name: "Last 14 Days", value: 14 },
              { name: "Last 30 Days", value: 30 },
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("system")
        .setDescription("View hardware resource telemetry and HP All-in-One system health"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("top")
        .setDescription("View top contributors by message volume and voice participation"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("export")
        .setDescription("Export full JSON analytics report for server leadership"),
    ) as SlashCommandBuilder,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const guildId = interaction.guildId;
    if (!guildId) {
      await interaction.reply({
        embeds: [createErrorEmbed("Guild Only", "This command can only be used inside a Discord server.")],
        ephemeral: true,
      });
      return;
    }

    const sub = interaction.options.getSubcommand();

    // ── Subcommand: stats ──────────────────────────────────
    if (sub === "stats") {
      await interaction.deferReply();
      const days = interaction.options.getInteger("days") ?? 7;

      try {
        const [summary, velocity] = await Promise.all([
          analyticsService.getActivitySummary(guildId),
          analyticsService.getRetentionAndVelocity(guildId, days),
        ]);

        const embed = createBaseEmbed()
          .setColor(Colors.PRIMARY)
          .setTitle(`📊 Community Analytics & Velocity (${days}d)`)
          .setDescription(
            `Detailed telemetry and engagement metrics for **${interaction.guild?.name || "Server"}**.`,
          )
          .addFields(
            {
              name: "🌟 Engagement Score",
              value: `${renderProgressBar(summary.engagementScore)}\nComposite health score based on user participation, voice duration & chat frequency.`,
              inline: false,
            },
            {
              name: "👥 Member Activity",
              value: `• **Total Members:** ${summary.totalMembers}\n• **Active (24h):** ${summary.activeLast24h}\n• **Active (7d):** ${summary.activeLast7d}`,
              inline: true,
            },
            {
              name: "💬 Chat Volume",
              value: `• **Total Messages:** ${summary.totalMessages.toLocaleString()}\n• **Avg / Active User:** ${summary.averageMessagesPerActiveMember}\n• **Daily Velocity:** ~${velocity.movingAverages.dailyMessages} msgs/day`,
              inline: true,
            },
            {
              name: "🎙️ Voice Activity",
              value: `• **Total Voice Hours:** ${summary.totalVoiceHours} hrs\n• **Voice Minutes:** ${summary.totalVoiceMinutes.toLocaleString()} min\n• **Daily Voice:** ~${Math.round(velocity.movingAverages.dailyVoiceMinutes / 60)} hrs/day`,
              inline: true,
            },
            {
              name: "📈 Growth & Retention",
              value: `• **Joins (${days}d):** +${velocity.totalJoins}\n• **Leaves (${days}d):** -${velocity.totalLeaves}\n• **Net Growth:** ${velocity.netGrowth >= 0 ? `+${velocity.netGrowth}` : velocity.netGrowth}`,
              inline: true,
            },
          );

        // Anomaly indicator field
        if (velocity.anomalies.length > 0) {
          const anomalyText = velocity.anomalies
            .map((a) => `• [${a.type.toUpperCase()}] **${a.metric}**: ${a.details}`)
            .join("\n");
          embed.addFields({
            name: "⚡ Activity Anomalies Detected",
            value: anomalyText,
            inline: false,
          });
        }

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Analytics Error", "Failed to compile server analytics.")],
        });
      }
      return;
    }

    // ── Subcommand: system ─────────────────────────────────
    if (sub === "system") {
      await interaction.deferReply();

      try {
        const telemetry = await analyticsService.getSystemTelemetry();

        const embed = createBaseEmbed()
          .setColor(Colors.ACCENT)
          .setTitle(`🖥️ ${BOT_NAME} Hardware & System Diagnostics`)
          .setDescription("Production telemetry optimized for HP All-in-One (4GB RAM) environment.")
          .addFields(
            {
              name: "🧠 Host RAM Allocation",
              value: `${renderProgressBar(telemetry.system.ramUsagePercent)}\n• **Used:** ${telemetry.system.usedRamMb} MB / **Total:** ${telemetry.system.totalRamMb} MB\n• **Free Headroom:** ${telemetry.system.freeRamMb} MB`,
              inline: false,
            },
            {
              name: "⚡ Bot Process Footprint",
              value: `• **Process RSS:** ${telemetry.process.memory.rssMb} MB (Budget: ≤350MB)\n• **Heap Used:** ${telemetry.process.memory.heapUsedMb} MB\n• **PID:** ${telemetry.process.pid} | **Node:** ${telemetry.process.nodeVersion}\n• **Uptime:** ${telemetry.process.uptimeFormatted}`,
              inline: true,
            },
            {
              name: "💾 SQLite Database Engine",
              value: `• **Mode:** ${telemetry.database.engine}\n• **Database Size:** ${telemetry.database.dbSizeMb} MB\n• **WAL Journal Size:** ${telemetry.database.walSizeMb} MB\n• **Total DB Footprint:** ${telemetry.database.totalDbSizeMb} MB`,
              inline: true,
            },
            {
              name: "💻 Host Processor & OS",
              value: `• **OS:** ${telemetry.system.osType} ${telemetry.system.osRelease} (${telemetry.system.arch})\n• **Host:** ${telemetry.system.hostname}\n• **CPU:** ${telemetry.system.cpuModel}\n• **Cores:** ${telemetry.system.cpuCores}`,
              inline: false,
            },
          );

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Diagnostics Failed", "Unable to gather system telemetry.")],
        });
      }
      return;
    }

    // ── Subcommand: top ────────────────────────────────────
    if (sub === "top") {
      await interaction.deferReply();

      try {
        const summary = await analyticsService.getActivitySummary(guildId);

        const chatRanking =
          summary.topChatters.length > 0
            ? summary.topChatters
                .map(
                  (m, i) =>
                    `**#${i + 1}** <@${m.userId}> — **${m.messageCount.toLocaleString()}** msgs (Lvl ${m.level})`,
                )
                .join("\n")
            : "_No chat records found yet._";

        const voiceRanking =
          summary.topVoiceUsers.length > 0
            ? summary.topVoiceUsers
                .map(
                  (m, i) =>
                    `**#${i + 1}** <@${m.userId}> — **${Math.round((m.voiceMinutes / 60) * 10) / 10}** hrs (${m.voiceMinutes} min)`,
                )
                .join("\n")
            : "_No voice records found yet._";

        const embed = createBaseEmbed()
          .setColor(Colors.PRIMARY)
          .setTitle("🏆 Community Activity Champions")
          .addFields(
            { name: "💬 Top Text Communicators", value: chatRanking, inline: false },
            { name: "🎙️ Top Voice Leaders", value: voiceRanking, inline: false },
          );

        await interaction.editReply({ embeds: [embed] });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Error", "Could not compile top contributors.")],
        });
      }
      return;
    }

    // ── Subcommand: export ─────────────────────────────────
    if (sub === "export") {
      // Check admin permission
      const isAdmin =
        interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
        interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);

      if (!isAdmin) {
        await interaction.reply({
          embeds: [
            createErrorEmbed(
              "Permission Denied",
              "Only server managers or administrators can export full community telemetry.",
            ),
          ],
          ephemeral: true,
        });
        return;
      }

      await interaction.deferReply({ ephemeral: true });

      try {
        const report = await analyticsService.exportAnalyticsJson(guildId);
        const jsonContent = JSON.stringify(report, null, 2);
        const buffer = Buffer.from(jsonContent, "utf-8");
        const attachment = new AttachmentBuilder(buffer, {
          name: `nexus-analytics-${guildId}-${analyticsService.getTodayDateString()}.json`,
        });

        await interaction.editReply({
          content: `📁 **NEXUS AI Analytics Export Complete**\nGenerated comprehensive telemetry export for **${interaction.guild?.name || guildId}**.`,
          files: [attachment],
        });
      } catch (error) {
        await interaction.editReply({
          embeds: [createErrorEmbed("Export Failed", "Failed to compile the JSON analytics export.")],
        });
      }
      return;
    }
  },
};
