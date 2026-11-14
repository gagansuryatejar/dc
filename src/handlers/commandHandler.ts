/**
 * Command handler for NEXUS AI.
 * Manages slash command registration, routing, cooldowns, and permission checks.
 */

import {
  Collection,
  type ChatInputCommandInteraction,
  type AutocompleteInteraction,
} from "discord.js";
import type { NexusCommand } from "../types/index.js";
import { hasPermission } from "../security/permissions.js";
import { createErrorEmbed } from "../utils/embeds.js";
import logger from "../logger/index.js";

export class CommandHandler {
  /** All registered commands keyed by name. */
  public readonly commands = new Collection<string, NexusCommand>();

  /** Per-user cooldown tracking: commandName → userId → expiresAt. */
  private readonly cooldowns = new Collection<string, Collection<string, number>>();

  /**
   * Register a command.
   */
  register(command: NexusCommand): void {
    this.commands.set(command.data.name, command);
    logger.debug(`Registered command: /${command.data.name} [${command.module}]`);
  }

  /**
   * Route a chat input interaction to the correct command handler.
   */
  async handle(interaction: ChatInputCommandInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Unknown command: /${interaction.commandName}`);
      return;
    }

    // Permission check
    if (!hasPermission(interaction, command.permissions)) {
      await interaction.reply({
        embeds: [createErrorEmbed("Permission Denied", "You do not have permission to use this command.")],
        ephemeral: true,
      });
      return;
    }

    // Cooldown check
    if (command.cooldownMs) {
      if (!this.cooldowns.has(command.data.name)) {
        this.cooldowns.set(command.data.name, new Collection());
      }

      const timestamps = this.cooldowns.get(command.data.name)!;
      const now = Date.now();
      const expiresAt = timestamps.get(interaction.user.id);

      if (expiresAt && now < expiresAt) {
        const remaining = ((expiresAt - now) / 1000).toFixed(1);
        await interaction.reply({
          embeds: [createErrorEmbed("Cooldown", `Please wait ${remaining}s before using this command again.`)],
          ephemeral: true,
        });
        return;
      }

      timestamps.set(interaction.user.id, now + command.cooldownMs);
      setTimeout(() => timestamps.delete(interaction.user.id), command.cooldownMs);
    }

    // Execute
    await command.execute(interaction);
  }

  /**
   * Route an autocomplete interaction to the correct command handler.
   */
  async handleAutocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const command = this.commands.get(interaction.commandName);
    if (!command?.autocomplete) return;

    try {
      await command.autocomplete(interaction);
    } catch (error) {
      logger.error({ error, command: interaction.commandName }, "Autocomplete handler error");
    }
  }
}

/** Singleton command handler instance. */
export const commandHandler = new CommandHandler();
export default commandHandler;
