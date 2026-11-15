/**
 * NEXUS AI — ModuleLoader
 * Manages module lifecycle: load, unload, healthCheck, command/event registration,
 * and interaction dispatch. Modules are isolated per guild via feature flags.
 */

import { createModuleLogger } from "../utils/logger.js";
import type { ModuleHealth, ModuleName } from "../types/index.js";

const moduleLog = createModuleLogger("module-loader");

/** Shape of a NEXUS module. */
export interface NexusModule {
  name: ModuleName;
  /** Array of slash-command definitions (for registration). */
  commands: Array<{
    name: string;
    description: string;
    options?: unknown[];
  }>;
  /** Array of event names this module listens to. */
  events: readonly string[];
  /** Optional handler for Discord interactions. */
  handleInteraction?: (
    interaction: import("discord.js").BaseInteraction,
  ) => Promise<void> | void;
  /** Optional health check. */
  healthCheck?: () => Promise<ModuleHealth>;
  /** Optional setup called on load. */
  onLoad?: () => Promise<void> | void;
  /** Optional teardown called on unload. */
  onUnload?: () => Promise<void> | void;
}

const loadedModules = new Map<ModuleName, NexusModule>();

export const moduleLoader = {
  /** Number of loaded modules. */
  get size(): number {
    return loadedModules.size;
  },

  /** Get a module by name. */
  get(name: ModuleName): NexusModule | undefined {
    return loadedModules.get(name);
  },

  /** List all loaded module names. */
  list(): ModuleName[] {
    return Array.from(loadedModules.keys());
  },

  /** Check if a module is loaded and enabled for a guild. */
  isLoaded(name: ModuleName): boolean {
    return loadedModules.has(name);
  },

  /**
   * Load a single module. Calls onLoad if present.
   */
  async load(module: NexusModule): Promise<void> {
    if (loadedModules.has(module.name)) {
      moduleLog.warn({ module: module.name }, "Module already loaded, skipping");
      return;
    }

    if (module.onLoad) {
      try {
        await module.onLoad();
      } catch (err) {
        moduleLog.error({ err, module: module.name }, "Module onLoad failed");
        throw err;
      }
    }

    loadedModules.set(module.name, module);
    moduleLog.info({ module: module.name, commands: module.commands.length }, "Module loaded");
  },

  /**
   * Load all modules passed explicitly. Modules are registered by index.ts.
   */
  async loadAll(): Promise<void> {
    // Modules are loaded explicitly in src/index.ts to keep load order deterministic
    // and to avoid dynamic imports that break tree-shaking.
  },

  /**
   * Unload a single module. Calls onUnload if present.
   */
  async unload(name: ModuleName): Promise<void> {
    const module = loadedModules.get(name);
    if (!module) return;

    if (module.onUnload) {
      try {
        await module.onUnload();
      } catch (err) {
        moduleLog.error({ err, module: name }, "Module onUnload failed");
      }
    }

    loadedModules.delete(name);
    moduleLog.info({ module: name }, "Module unloaded");
  },

  /** Unload all modules. */
  async unloadAll(): Promise<void> {
    const names = Array.from(loadedModules.keys());
    for (const name of names) {
      await this.unload(name);
    }
  },

  /**
   * Dispatch a Discord interaction to the appropriate module handler.
   * Multiple modules can handle the same interaction (first handler wins).
   */
  async handleInteraction(
    interaction: import("discord.js").BaseInteraction,
  ): Promise<void> {
    // Slash commands
    if (interaction.isChatInputCommand()) {
      const commandName = interaction.commandName;
      for (const [, module] of loadedModules) {
        const matches = module.commands.some((c) => c.name === commandName);
        if (!matches) continue;

        const handler = module.handleInteraction;
        if (!handler) {
          moduleLog.warn(
            { module: module.name, command: commandName },
            "Module has command but no interaction handler",
          );
          continue;
        }

        try {
          await handler(interaction);
          return;
        } catch (err) {
          moduleLog.error({ err, module: module.name, command: commandName }, "Command handler error");
          if (interaction.replied || interaction.deferred) {
            await interaction.followUp({
              content: "❌ An error occurred while processing your request.",
              flags: 64, // ephemeral
            });
          } else {
            await interaction.reply({
              content: "❌ An error occurred while processing your request.",
              flags: 64,
            });
          }
          return;
        }
      }

      // No module handled this command
      moduleLog.warn({ command: commandName }, "No module handled this slash command");
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "❌ This command is not currently available.",
          flags: 64,
        });
      }
      return;
    }

    // Buttons, select menus, modals — dispatch to any module that handles them
    for (const [, module] of loadedModules) {
      if (!module.handleInteraction) continue;
      try {
        await module.handleInteraction(interaction);
        return;
      } catch (err) {
        moduleLog.error({ err, module: module.name }, "Interaction handler error");
      }
    }
  },

  /**
   * Run health checks on all loaded modules.
   */
  async healthCheckAll(): Promise<ModuleHealth[]> {
    const results: ModuleHealth[] = [];
    for (const [name, module] of loadedModules) {
      if (module.healthCheck) {
        try {
          results.push(await module.healthCheck());
        } catch (err) {
          results.push({
            status: "unhealthy",
            module: name,
            details: { error: String(err) },
          });
        }
      } else {
        results.push({ status: "healthy", module: name });
      }
    }
    return results;
  },
};
