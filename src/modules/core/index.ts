/**
 * NEXUS AI — Core Module
 * Foundation commands (/nexus, /help, /admin) and core events.
 */

import {
  ChatInputCommandInteraction,
  Events,
  type BaseInteraction,
} from "discord.js";
import { createModuleLogger } from "../../utils/logger.js";
import {
  command as nexusCommandDef,
  handle as nexusCommandHandle,
} from "./commands/nexus.js";
import {
  command as helpCommandDef,
  handle as helpCommandHandle,
} from "./commands/help.js";
import {
  command as adminCommandDef,
  handle as adminCommandHandle,
} from "./commands/admin.js";

const moduleLog = createModuleLogger("core");

/**
 * Commands exported by this module (registered with Discord).
 */
export const commands = [
  nexusCommandDef,
  helpCommandDef,
  adminCommandDef,
];

/** Events this module listens to. */
export const events = [
  Events.ClientReady,
  Events.GuildCreate,
  Events.GuildDelete,
  Events.InteractionCreate,
] as const;

const moduleName = "core" as const;

/**
 * Handle interactions routed to the core module.
 */
export async function handleInteraction(interaction: BaseInteraction): Promise<void> {
  if (!interaction.isChatInputCommand()) return;

  const commandName = interaction.commandName;

  if (commandName === nexusCommandDef.name) {
    await nexusCommandHandle(interaction as ChatInputCommandInteraction);
    return;
  }

  if (commandName === helpCommandDef.name) {
    await helpCommandHandle(interaction as ChatInputCommandInteraction);
    return;
  }

  if (commandName === adminCommandDef.name) {
    await adminCommandHandle(interaction as ChatInputCommandInteraction);
    return;
  }
}

/**
 * Health check for the core module.
 */
export async function healthCheck() {
  return {
    status: "healthy" as const,
    module: moduleName,
    details: {
      commands: commands.length,
      events: events.length,
    },
  };
}

/**
 * Optional setup on module load.
 */
export async function onLoad() {
  moduleLog.info("Core module initialised");
}

/**
 * Optional teardown on module unload.
 */
export async function onUnload() {
  moduleLog.info("Core module unloaded");
}

export default {
  name: moduleName,
  commands,
  events,
  handleInteraction,
  healthCheck,
  onLoad,
  onUnload,
};
