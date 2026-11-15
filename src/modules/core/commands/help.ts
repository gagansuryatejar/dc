/**
 * NEXUS AI — /help command
 * Interactive categorized command directory.
 */

import {
  ChatInputCommandInteraction,
  type CacheType,
} from "discord.js";
import { moduleLoader } from "../../../handlers/moduleLoader.js";

export const command = {
  name: "help",
  description: "Browse NEXUS AI commands by module.",
  options: [
    {
      name: "module",
      type: 3, // STRING
      description: "Filter commands by module name.",
      required: false,
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
};

export async function handle(
  interaction: ChatInputCommandInteraction<CacheType>,
): Promise<void> {
  const filter = interaction.options.getString("module");

  let lines = "";
  let any = false;

  for (const name of moduleLoader.list()) {
    const mod = moduleLoader.get(name);
    if (!mod) continue;
    if (filter && name !== filter) continue;
    if (mod.commands.length === 0) continue;
    any = true;
    lines += `**/${name}** — ${mod.commands.map((c) => c.name).join(", ")}\n`;
  }

  if (!any) {
    lines = "No commands available for the selected module.";
  }

  await interaction.reply({
    content: `**NEXUS AI Commands**\n${lines}`,
    flags: 64,
  });
}
