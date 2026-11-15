/**
 * NEXUS HEART — Voice Companion Module
 * Automates voice channel presence with AI companion features.
 * Joins empty channels, greets members, manages idle timeouts, rewards participation.
 */

import type { NexusModule, ModuleHealth } from "../../types/index.js";
import { voiceData } from "./commands/index.js";
import { voiceStateUpdateName } from "./events/index.js";
import { connectionManager } from "./services/connectionManager.js";
import { IDLE_TIMEOUT_MS } from "../../utils/constants.js";
import { createModuleLogger } from "../../utils/logger.js";

const log = createModuleLogger("voice");

function toModuleCommand(data: any) {
  return {
    name: data.name,
    description: data.description,
    options: data.options,
  };
}

let idleCheckInterval: NodeJS.Timeout | null = null;

export const voiceModule: NexusModule = {
  name: "voice",
  commands: [toModuleCommand(voiceData)],
  events: [voiceStateUpdateName],

  async onLoad(): Promise<void> {
    log.info("Voice module loaded - NEXUS HEART companion ready");

    idleCheckInterval = setInterval(() => {
      for (const guildId of connectionManager.getActiveGuilds()) {
        const info = connectionManager.getConnectionInfo(guildId);
        if (!info) continue;

        const now = Date.now();
        const idleDuration = now - info.lastActivity;

        if (idleDuration > IDLE_TIMEOUT_MS && !info.isIdle) {
          log.debug({ guildId, idleMs: idleDuration }, "Starting idle detection");
        }
      }
    }, 5_000);
  },

  async onUnload(): Promise<void> {
    log.info("Voice module unloaded");
    connectionManager.shutdown();
    if (idleCheckInterval) {
      clearInterval(idleCheckInterval);
      idleCheckInterval = null;
    }
  },

  async healthCheck(): Promise<ModuleHealth> {
    const activeGuilds = connectionManager.getActiveGuilds();
    return {
      status: "healthy",
      module: "voice",
      details: {
        activeConnections: activeGuilds.length,
        guilds: activeGuilds,
      },
    };
  },

  async handleInteraction(interaction: import("discord.js").BaseInteraction): Promise<void> {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    if (commandName === "voice") {
      const { voiceExecute } = await import("./commands/index.js");
      await voiceExecute(interaction as import("discord.js").ChatInputCommandInteraction);
    }
  },
};