/**
 * Command handler for NEXUS AI.
 * Manages slash command registration, routing, cooldowns, and permission checks.
 */
import { Collection, type ChatInputCommandInteraction, type AutocompleteInteraction } from "discord.js";
import type { NexusCommand } from "../types/index.js";
export declare class CommandHandler {
    /** All registered commands keyed by name. */
    readonly commands: Collection<string, NexusCommand>;
    /** Per-user cooldown tracking: commandName → userId → expiresAt. */
    private readonly cooldowns;
    /**
     * Register a command.
     */
    register(command: NexusCommand): void;
    /**
     * Route a chat input interaction to the correct command handler.
     */
    handle(interaction: ChatInputCommandInteraction): Promise<void>;
    /**
     * Route an autocomplete interaction to the correct command handler.
     */
    handleAutocomplete(interaction: AutocompleteInteraction): Promise<void>;
}
/** Singleton command handler instance. */
export declare const commandHandler: CommandHandler;
export default commandHandler;
