/**
 * NEXUS AI — /nexus command group
 * Diagnostic and module-control commands.
 */

import {
  ChatInputCommandInteraction,
  EmbedBuilder,
  type CacheType,
} from "discord.js";
import { config } from "../../../config/index.js";
import { BOT_NAME, BOT_VERSION, BOT_TAGLINE } from "../../../utils/constants.js";
import { moduleLoader } from "../../../handlers/moduleLoader.js";
import {
  guildRepository,
  databaseHealth,
} from "../../../database/index.js";
import { moduleConfigRepository } from "../../../database/index.js";
import { adminLimiter } from "../../../security/rate-limiter.js";

export const command = {
  name: "nexus",
  description: "NEXUS AI diagnostics, info, and module control.",
  options: [
    {
      name: "info",
      type: 1, // SUB_COMMAND
      description: "Show NEXUS AI version and system information.",
    },
    {
      name: "ping",
      type: 1,
      description: "Check bot and Discord gateway latency.",
    },
    {
      name: "status",
      type: 1,
      description: "Show bot uptime, database health, and module status.",
    },
    {
      name: "modules",
      type: 1,
      description: "List loaded modules and their status.",
    },
    {
      name: "enable",
      type: 1,
      description: "Enable a module for this server (Administrator).",
      options: [
        {
          name: "module",
          type: 3, // STRING
          description: "Module name to enable.",
          required: true,
          choices: [
            { name: "core", value: "core" },
            { name: "engagement", value: "engagement" },
            { name: "voice", value: "voice" },
            { name: "heart", value: "heart" },
            { name: "ai", value: "ai" },
            { name: "moderation", value: "moderation" },
            { name: "streamer", value: "streamer" },
            { name: "analytics", value: "analytics" },
          ],
        },
      ],
    },
    {
      name: "disable",
      type: 1,
      description: "Disable a module for this server (Administrator).",
      options: [
        {
          name: "module",
          type: 3,
          description: "Module name to disable.",
          required: true,
          choices: [
            { name: "core", value: "core" },
            { name: "engagement", value: "engagement" },
            { name: "voice", value: "voice" },
            { name: "heart", value: "heart" },
            { name: "ai", value: "ai" },
            { name: "moderation", value: "moderation" },
            { name: "streamer", value: "streamer" },
            { name: "analytics", value: "analytics" },
          ],
        },
      ],
    },
  ],
};

/**
 * Handle /nexus subcommands.
 */
export async function handle(
  interaction: ChatInputCommandInteraction<CacheType>,
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  const guildId = interaction.guildId;
  const userId = interaction.user.id;

  // Rate limit administrative operations
  if (["enable", "disable"].includes(subcommand)) {
    const limited = adminLimiter.consume(`admin:${userId}`);
    if (limited.limited) {
      await interaction.reply({
        content: `⏳ You're using admin commands too quickly. Try again in ${limited.resetInMs}ms.`,
        flags: 64, // ephemeral
      });
      return;
    }
  }

  switch (subcommand) {
    case "info":
      await handleInfo(interaction);
      break;
    case "ping":
      await handlePing(interaction);
      break;
    case "status":
      await handleStatus(interaction);
      break;
    case "modules":
      await handleModules(interaction);
      break;
    case "enable":
      await handleToggle(interaction, guildId, true);
      break;
    case "disable":
      await handleToggle(interaction, guildId, false);
      break;
    default:
      await interaction.reply({
        content: "❌ Unknown /nexus subcommand.",
        flags: 64,
      });
  }
}

/** /nexus info */
async function handleInfo(interaction: ChatInputCommandInteraction<CacheType>) {
  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(`${BOT_NAME} v${BOT_VERSION}`)
    .setDescription(BOT_TAGLINE)
    .addFields(
      {
        name: "Environment",
        value: config.nodeEnv.charAt(0).toUpperCase() + config.nodeEnv.slice(1),
        inline: true,
      },
      {
        name: "Database",
        value: "PostgreSQL",
        inline: true,
      },
      {
        name: "Guilds",
        value: interaction.client.guilds.cache.size.toString(),
        inline: true,
      },
      {
        name: "AI Provider",
        value: config.ai.provider,
        inline: true,
      },
      {
        name: "Owner ID",
        value: config.discord.ownerId || "Not set",
        inline: true,
      },
      {
        name: "Dev Guild",
        value: config.discord.guildId || "Not set",
        inline: true,
      },
    )
    .setTimestamp()
    .setFooter({ text: "NEXUS AI — Your Community. Your AI. Your Connection." });

  await interaction.reply({ embeds: [embed] });
}

/** /nexus ping */
async function handlePing(interaction: ChatInputCommandInteraction<CacheType>) {
  const sent = Date.now();
  await interaction.deferReply({ flags: 64 });
  const roundtrip = Date.now() - sent;
  const gateway = interaction.client.ws.ping;

  await interaction.editReply(
    `🏓 Pong!\n• Roundtrip: ${roundtrip}ms\n• Gateway: ${gateway}ms`,
  );
}

/** /nexus status */
async function handleStatus(interaction: ChatInputCommandInteraction<CacheType>) {
  const dbHealth = await databaseHealth();

  const uptimeSeconds = Math.floor(process.uptime());

  const embed = new EmbedBuilder()
    .setColor(dbHealth.healthy ? 0x57f287 : 0xed4245)
    .setTitle("🔧 NEXUS AI Status")
    .addFields(
      {
        name: "Database (PostgreSQL)",
        value: dbHealth.healthy
          ? `✅ Healthy (${dbHealth.latencyMs}ms)`
          : "❌ Unhealthy / unreachable",
        inline: true,
      },
      {
        name: "Uptime",
        value: `${uptimeSeconds}s`,
        inline: true,
      },
      {
        name: "Modules Loaded",
        value: moduleLoader.size.toString(),
        inline: true,
      },
      {
        name: "Node Environment",
        value: config.nodeEnv,
        inline: true,
      },
    )
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
}

/** /nexus modules */
async function handleModules(interaction: ChatInputCommandInteraction<CacheType>) {
  const modules = moduleLoader.list();
  if (modules.length === 0) {
    await interaction.reply({
      content: "No modules currently loaded.",
      flags: 64,
    });
    return;
  }

  const lines = modules.map((m) => `• **${m}**`).join("\n");
  await interaction.reply({
    content: `**Loaded Modules:**\n${lines}`,
    flags: 64,
  });
}

/** /nexus enable | /nexus disable */
async function handleToggle(
  interaction: ChatInputCommandInteraction<CacheType>,
  guildId: string | null,
  enable: boolean,
) {
  const moduleName = interaction.options.getString("module", true);

  if (!guildId) {
    await interaction.reply({
      content: "❌ Module toggling is only available inside a server.",
      flags: 64,
    });
    return;
  }

  // Administrator-only
  const member = interaction.guild?.members.cache.get(interaction.user.id);
  if (!member?.permissions.has("Administrator")) {
    await interaction.reply({
      content: "❌ You must be an Administrator to enable/disable modules.",
      flags: 64,
    });
    return;
  }

  try {
    await moduleConfigRepository.setEnabled(guildId, moduleName, enable);
    await guildRepository.setFeatureFlag(guildId, moduleName, enable);

    const action = enable ? "enabled" : "disabled";
    await interaction.reply({
      content: `✅ Module **${moduleName}** has been ${action} for this server.`,
      flags: 64,
    });
  } catch (err) {
    console.error(err);
    await interaction.reply({
      content: "❌ Failed to update module settings.",
      flags: 64,
    });
  }
}
