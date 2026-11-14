/**
 * /nexus slash command group.
 * Provides system status, diagnostics, module management, and host resource telemetry.
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  EmbedBuilder,
  version as djsVersion,
} from "discord.js";
import os from "node:os";
import { CORE, ALL_MODULE_NAMES, type ModuleName } from "../../../config/features.js";
import { PermissionLevel, type NexusCommand } from "../../../types/index.js";
import { Colors, createErrorEmbed, createSuccessEmbed } from "../../../utils/embeds.js";
import { BOT_NAME, BOT_VERSION, EMOJIS, FOOTER_TEXT } from "../../../utils/constants.js";
import { moduleLoader } from "../../../handlers/moduleLoader.js";
import { moduleConfigRepository } from "../../../database/index.js";
import { powerGuardService } from "../services/power-guard.service.js";
import type { NexusClient } from "../../../bot/client.js";

export const nexusCommand: NexusCommand = {
  data: new SlashCommandBuilder()
    .setName("nexus")
    .setDescription("NEXUS AI system diagnostics, status, and module operations")
    .addSubcommand((sub) =>
      sub.setName("info").setDescription("Display overview of NEXUS AI system and platform"),
    )
    .addSubcommand((sub) =>
      sub.setName("ping").setDescription("Check WebSocket heartbeat and API latency"),
    )
    .addSubcommand((sub) =>
      sub.setName("status").setDescription("View live health and resource metrics of the host machine"),
    )
    .addSubcommand((sub) =>
      sub.setName("modules").setDescription("List installed modules and their current guild status"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("enable")
        .setDescription("Enable a modular subsystem for this server (Admin only)")
        .addStringOption((opt) =>
          opt
            .setName("module")
            .setDescription("The module to enable")
            .setRequired(true)
            .addChoices(
              ...ALL_MODULE_NAMES.filter((m) => m !== CORE).map((m) => ({
                name: m,
                value: m,
              })),
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("disable")
        .setDescription("Disable a modular subsystem for this server (Admin only)")
        .addStringOption((opt) =>
          opt
            .setName("module")
            .setDescription("The module to disable")
            .setRequired(true)
            .addChoices(
              ...ALL_MODULE_NAMES.filter((m) => m !== CORE).map((m) => ({
                name: m,
                value: m,
              })),
            ),
        ),
    )
    .addSubcommand((sub) =>
      sub
        .setName("mobile")
        .setDescription("View Android Termux deployment, battery status, and power guard telemetry"),
    )
    .addSubcommand((sub) =>
      sub
        .setName("ecomode")
        .setDescription("Toggle mobile eco-mode power saving profile (Admin only)")
        .addBooleanOption((opt) =>
          opt
            .setName("enabled")
            .setDescription("Enable or disable power conservation mode")
            .setRequired(true),
        ),
    ),

  module: CORE,
  permissions: PermissionLevel.MEMBER,
  cooldownMs: 3000,

  async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const sub = interaction.options.getSubcommand();
    const client = interaction.client as NexusClient;

    if (sub === "ping") {
      const sent = await interaction.deferReply({ fetchReply: true });
      const roundtrip = sent.createdTimestamp - interaction.createdTimestamp;
      const wsPing = client.ws.ping;

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`${EMOJIS.PING} Network Latency`)
        .addFields(
          { name: "WebSocket Heartbeat", value: `\`${wsPing}ms\``, inline: true },
          { name: "Roundtrip Latency", value: `\`${roundtrip}ms\``, inline: true },
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      return;
    }

    if (sub === "info") {
      const stats = client.getResourceStats ? client.getResourceStats() : null;
      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`⚡ ${BOT_NAME} v${BOT_VERSION}`)
        .setDescription(
          "Next Generation AI-Powered Discord Community Operating System.\nModular, secure, and resource-efficient architecture.",
        )
        .addFields(
          { name: `${EMOJIS.SERVER} Servers`, value: `\`${stats?.guildsCount ?? client.guilds.cache.size}\``, inline: true },
          { name: `${EMOJIS.STAR} Members`, value: `\`${stats?.usersCount ?? "Cached"}\``, inline: true },
          { name: `${EMOJIS.GEAR} Active Modules`, value: `\`${moduleLoader.size}\``, inline: true },
          { name: `${EMOJIS.CLOCK} Uptime`, value: `\`${stats?.uptime ?? "Active"}\``, inline: true },
          { name: "Runtime", value: `\`Node.js ${process.version}\``, inline: true },
          { name: "discord.js", value: `\`v${djsVersion}\``, inline: true },
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "status") {
      const stats = client.getResourceStats();
      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`${EMOJIS.CHART} Host Diagnostics & Resource Telemetry`)
        .setDescription(`Telemetry for production host: **${os.hostname()}** (${os.type()} ${os.arch()})`)
        .addFields(
          { name: "Process RSS (RAM)", value: `\`${stats.rss}\``, inline: true },
          { name: "Process Heap Used", value: `\`${stats.heapUsed}\``, inline: true },
          { name: "Heap Allocated", value: `\`${stats.heapTotal}\``, inline: true },
          {
            name: "Host Total RAM",
            value: `\`${stats.systemTotalRamMb} MB\` (\`${stats.systemRamUsagePercent}%\` used)`,
            inline: true,
          },
          { name: "Host Free RAM", value: `\`${stats.systemFreeRamMb} MB\``, inline: true },
          { name: "Gateway Ping", value: `\`${stats.ping}ms\``, inline: true },
          { name: "System Uptime", value: `\`${stats.uptime}\``, inline: true },
          { name: "Database Engine", value: "`SQLite (WAL Mode)`", inline: true },
          { name: "Architecture Target", value: "`HP All-in-One / Win10`", inline: true },
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "modules") {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({ embeds: [createErrorEmbed("Error", "Command must be used inside a guild.")], ephemeral: true });
        return;
      }

      const all = moduleLoader.getAll();
      const fields = await Promise.all(
        all.map(async (mod) => {
          let isGuildEnabled = true;
          if (mod.name !== CORE) {
            isGuildEnabled = await moduleConfigRepository.isEnabled(guildId, mod.name);
          }
          const statusEmoji = isGuildEnabled ? EMOJIS.ENABLED : EMOJIS.DISABLED;
          return {
            name: `${statusEmoji} ${mod.name} (v${mod.version})`,
            value: `${mod.description}\n*Status: ${isGuildEnabled ? "Enabled" : "Disabled"}*`,
            inline: false,
          };
        }),
      );

      const embed = new EmbedBuilder()
        .setColor(Colors.PRIMARY)
        .setTitle(`${EMOJIS.GEAR} NEXUS AI Subsystem Status`)
        .setDescription(`Current module operational state for **${interaction.guild?.name}**:`)
        .addFields(fields)
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    if (sub === "enable" || sub === "disable") {
      const guildId = interaction.guildId;
      if (!guildId) {
        await interaction.reply({ embeds: [createErrorEmbed("Error", "Command must be used inside a guild.")], ephemeral: true });
        return;
      }

      // Check admin permission
      const member = interaction.member;
      const isAdministrator =
        member && "permissions" in member && typeof member.permissions !== "string"
          ? member.permissions.has("Administrator")
          : false;

      if (!isAdministrator) {
        await interaction.reply({
          embeds: [createErrorEmbed("Permission Denied", "You must possess Administrator permissions to alter module configurations.")],
          ephemeral: true,
        });
        return;
      }

      const targetMod = interaction.options.getString("module", true) as ModuleName;
      if (targetMod === CORE) {
        await interaction.reply({
          embeds: [createErrorEmbed("Forbidden", "The core module is foundational and cannot be modified.")],
          ephemeral: true,
        });
        return;
      }

      const enableAction = sub === "enable";
      await moduleConfigRepository.setEnabled(guildId, targetMod, enableAction);

      const successEmbed = createSuccessEmbed(
        `Subsystem ${enableAction ? "Enabled" : "Disabled"}`,
        `Successfully ${enableAction ? "enabled" : "disabled"} module **${targetMod}** for **${interaction.guild?.name}**.`,
      );

      await interaction.reply({ embeds: [successEmbed] });
      return;
    }

    // ── Subcommand: mobile ──────────────────────────────────
    if (sub === "mobile") {
      const telemetry = powerGuardService.getMobileTelemetry();

      const embed = new EmbedBuilder()
        .setColor(telemetry.isEcoMode ? Colors.WARNING : Colors.PRIMARY)
        .setTitle("📱 NEXUS AI Mobile & Termux Telemetry")
        .setDescription(
          `Deployment Profile: **${telemetry.deploymentMode.toUpperCase()}** (${telemetry.voiceProfile} voice)` +
            `\nTarget Hardware: **OPPO Reno10 5G (8GB RAM)** / HP All-in-One`,
        )
        .addFields(
          {
            name: "🔋 Battery & Power Status",
            value:
              `• **Level:** ${telemetry.battery.percentage}%\n` +
              `• **Plugged:** \`${telemetry.battery.plugged}\`\n` +
              `• **State:** \`${telemetry.battery.status}\`\n` +
              `• **Temperature:** ${telemetry.battery.temperature}°C`,
            inline: true,
          },
          {
            name: "⚡ Power Guard & Wake-Lock",
            value:
              `• **Eco Mode:** \`${telemetry.isEcoMode ? "ACTIVE" : "STANDBY"}\`\n` +
              `• **Wake-Lock:** \`${telemetry.wakeLockActive ? "HELD (termux-wake-lock)" : "INACTIVE"}\`\n` +
              `• **Status Reason:** _${telemetry.ecoModeReason}_`,
            inline: true,
          },
          {
            name: "🧠 Mobile Memory Budget",
            value:
              `• **Current RSS:** ${telemetry.currentRssMb} MB\n` +
              `• **Target Limit:** $\\le$ ${telemetry.targetMemoryBudgetMb} MB\n` +
              `• **Within Budget:** ${telemetry.withinBudget ? "✅ Compliant" : "⚠️ Exceeding"}`,
            inline: false,
          },
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      return;
    }

    // ── Subcommand: ecomode ─────────────────────────────────
    if (sub === "ecomode") {
      const member = interaction.member;
      const isAdministrator =
        member && "permissions" in member && typeof member.permissions !== "string"
          ? member.permissions.has("Administrator")
          : false;

      if (!isAdministrator) {
        await interaction.reply({
          embeds: [createErrorEmbed("Permission Denied", "Administrator permissions are required to toggle eco mode.")],
          ephemeral: true,
        });
        return;
      }

      const enabled = interaction.options.getBoolean("enabled", true);
      powerGuardService.setEcoMode(enabled, `Toggled by administrator @${interaction.user.username}`);

      const embed = enabled
        ? createSuccessEmbed(
            "Eco Mode Activated",
            "⚡ Mobile power-saving profile engaged. Background tasks throttled to extend battery life on mobile hosts.",
          )
        : createSuccessEmbed(
            "Eco Mode Deactivated",
            "✨ Standard performance profile restored.",
          );

      await interaction.reply({ embeds: [embed] });
      return;
    }
  },
};
