/**
 * NEXUS AI — /admin command (settings)
 * Server administration commands (Administrator only).
 */

import {
  ChatInputCommandInteraction,
  type CacheType,
} from "discord.js";
import { adminLimiter } from "../../../security/rate-limiter.js";
import { guildRepository } from "../../../database/index.js";
import { validateTimezone, validateLocale, escapeMarkdown } from "../../../security/validators.js";

export const command = {
  name: "admin",
  description: "Server administration settings (Administrator only).",
  options: [
    {
      name: "settings",
      type: 1, // SUB_COMMAND_GROUP
      description: "Configure core server settings.",
      options: [
        {
          name: "welcome-channel",
          type: 1,
          description: "Set the welcome channel.",
          options: [
            {
              name: "channel",
              type: 7, // CHANNEL
              description: "Welcome channel.",
              required: true,
            },
          ],
        },
        {
          name: "log-channel",
          type: 1,
          description: "Set the moderation log channel.",
          options: [
            {
              name: "channel",
              type: 7,
              description: "Log channel.",
              required: true,
            },
          ],
        },
        {
          name: "announcement-channel",
          type: 1,
          description: "Set the announcement channel.",
          options: [
            {
              name: "channel",
              type: 7,
              description: "Announcement channel.",
              required: true,
            },
          ],
        },
        {
          name: "locale",
          type: 1,
          description: "Set the server locale.",
          options: [
            {
              name: "code",
              type: 3,
              description: "Locale code (en, te).",
              required: true,
              choices: [
                { name: "English", value: "en" },
                { name: "Telugu", value: "te" },
              ],
            },
          ],
        },
        {
          name: "timezone",
          type: 1,
          description: "Set the server timezone.",
          options: [
            {
              name: "zone",
              type: 3,
              description: "IANA timezone (e.g. UTC, Asia/Kolkata).",
              required: true,
            },
          ],
        },
      ],
    },
  ],
};

export async function handle(
  interaction: ChatInputCommandInteraction<CacheType>,
): Promise<void> {
  const userId = interaction.user.id;
  const limited = adminLimiter.consume(`admin:${userId}`);
  if (limited.limited) {
    await interaction.reply({
      content: `⏳ Please slow down. Try again in ${limited.resetInMs}ms.`,
      flags: 64,
    });
    return;
  }

  const guildId = interaction.guildId;
  if (!guildId) {
    await interaction.reply({
      content: "❌ Administration is only available inside a server.",
      flags: 64,
    });
    return;
  }

  const member = interaction.guild?.members.cache.get(userId);
  if (!member?.permissions.has("Administrator")) {
    await interaction.reply({
      content: "❌ You must be an Administrator to use /admin.",
      flags: 64,
    });
    return;
  }

  const group = interaction.options.getSubcommandGroup();
  const subcommand = interaction.options.getSubcommand();

  if (group !== "settings") {
    await interaction.reply({
      content: "❌ Unknown /admin group.",
      flags: 64,
    });
    return;
  }

  switch (subcommand) {
    case "welcome-channel":
      await setChannel(interaction, guildId, "welcomeChannel", "Welcome channel");
      break;
    case "log-channel":
      await setChannel(interaction, guildId, "logChannel", "Log channel");
      break;
    case "announcement-channel":
      await setChannel(interaction, guildId, "announcementChannel", "Announcement channel");
      break;
    case "locale":
      await setLocale(interaction, guildId);
      break;
    case "timezone":
      await setTimezone(interaction, guildId);
      break;
    default:
      await interaction.reply({
        content: "❌ Unknown /admin settings subcommand.",
        flags: 64,
      });
  }
}

async function setChannel(
  interaction: ChatInputCommandInteraction<CacheType>,
  guildId: string,
  field: "welcomeChannel" | "logChannel" | "announcementChannel",
  label: string,
) {
  const channel = interaction.options.getChannel("channel", true);
  if (!channel || channel.type !== 0) {
    await interaction.reply({
      content: "❌ Please select a text channel.",
      flags: 64,
    });
    return;
  }

  await guildRepository.update(guildId, { [field]: channel.id });
  await interaction.reply({
    content: `✅ ${label} set to <#${channel.id}>.`,
    flags: 64,
  });
}

async function setLocale(
  interaction: ChatInputCommandInteraction<CacheType>,
  guildId: string,
) {
  const code = interaction.options.getString("code", true);
  if (!validateLocale(code)) {
    await interaction.reply({
      content: `❌ Unsupported locale "${escapeMarkdown(code)}". Supported: en, te`,
      flags: 64,
    });
    return;
  }

  await guildRepository.update(guildId, { locale: code });
  await interaction.reply({
    content: `✅ Server locale set to **${code}**.`,
    flags: 64,
  });
}

async function setTimezone(
  interaction: ChatInputCommandInteraction<CacheType>,
  guildId: string,
) {
  const zone = interaction.options.getString("zone", true);
  if (!validateTimezone(zone)) {
    await interaction.reply({
      content: `❌ Invalid timezone "${escapeMarkdown(zone)}". Use an IANA zone (e.g. UTC, Asia/Kolkata).`,
      flags: 64,
    });
    return;
  }

  await guildRepository.update(guildId, { timezone: zone });
  await interaction.reply({
    content: `✅ Server timezone set to **${zone}**.`,
    flags: 64,
  });
}
