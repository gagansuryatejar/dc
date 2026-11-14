import type { SlashCommandBuilder, SlashCommandSubcommandsOnlyBuilder, SlashCommandOptionsOnlyBuilder, ChatInputCommandInteraction, AutocompleteInteraction, ButtonInteraction, StringSelectMenuInteraction, ChannelSelectMenuInteraction, RoleSelectMenuInteraction, UserSelectMenuInteraction, MentionableSelectMenuInteraction, ModalSubmitInteraction, ClientEvents, Awaitable, ContextMenuCommandBuilder } from "discord.js";
import type { ModuleName } from "../config/features.js";
/**
 * Hierarchical permission tiers used by the command system.
 * Higher numeric values imply broader privileges.
 */
export declare enum PermissionLevel {
    /** Default level — any server member. */
    MEMBER = 0,
    /** Moderators — users with Manage Messages or a mod role. */
    MODERATOR = 1,
    /** Administrators — users with the Administrator permission. */
    ADMIN = 2,
    /** Bot owner — the account ID listed in the config. */
    OWNER = 3
}
export type HealthStatus = "healthy" | "degraded" | "unhealthy";
export interface ModuleHealth {
    /** Current health of the module. */
    status: HealthStatus;
    /** Human-readable explanation of the current status. */
    message: string;
    /** ISO-8601 timestamp of the last health check. */
    lastCheck: Date;
}
/**
 * Accepted command "data" shapes — covers regular slash commands,
 * sub-command-only builders, and context-menu commands.
 */
export type CommandData = SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder | SlashCommandOptionsOnlyBuilder | Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup"> | ContextMenuCommandBuilder;
export interface NexusCommand {
    /** The slash-command (or context-menu) builder that is registered with Discord. */
    data: CommandData;
    /** The module this command belongs to. */
    module: ModuleName;
    /** Minimum permission level required to invoke this command. */
    permissions: PermissionLevel;
    /** Whether the command is available only in the dev guild. */
    devOnly?: boolean;
    /** Cooldown between invocations in milliseconds (per-user). */
    cooldownMs?: number;
    /** Execute the command interaction. */
    execute(interaction: ChatInputCommandInteraction): Awaitable<void>;
    /** Handle autocomplete for this command's options, if any. */
    autocomplete?(interaction: AutocompleteInteraction): Awaitable<void>;
}
export interface NexusEvent<K extends keyof ClientEvents = keyof ClientEvents> {
    /** Discord.js event name (e.g. `"messageCreate"`). */
    name: K;
    /** If `true`, the listener fires at most once and then unregisters. */
    once: boolean;
    /** The module this event handler belongs to. */
    module: ModuleName;
    /** The handler function — receives the event's arguments. */
    execute(...args: ClientEvents[K]): Awaitable<void>;
}
export interface NexusModule {
    /** Unique identifier that matches a `ModuleName` constant. */
    name: ModuleName;
    /** Short human-readable description shown in dashboards and help text. */
    description: string;
    /** SemVer version string for this module. */
    version: string;
    /** Called once when the module is first loaded into the bot. */
    onLoad(): Awaitable<void>;
    /** Called when the bot is shutting down or the module is being removed. */
    onUnload(): Awaitable<void>;
    /** Called when the module is enabled at runtime (after being disabled). */
    onEnable(): Awaitable<void>;
    /** Called when the module is disabled at runtime. */
    onDisable(): Awaitable<void>;
    /** Return the module's current health status. */
    healthCheck(): Awaitable<ModuleHealth>;
    /** Slash / context-menu commands provided by this module. */
    commands: ReadonlyArray<NexusCommand>;
    /** Discord.js event listeners provided by this module. */
    events: ReadonlyArray<NexusEvent>;
}
/** Union of every select-menu interaction variant. */
export type AnySelectMenuInteraction = StringSelectMenuInteraction | ChannelSelectMenuInteraction | RoleSelectMenuInteraction | UserSelectMenuInteraction | MentionableSelectMenuInteraction;
/** Handler for a button click keyed by custom ID (or prefix). */
export interface ButtonHandler {
    /** The `customId` this handler responds to (exact match or prefix). */
    customId: string;
    /** Whether `customId` should be treated as a prefix rather than an exact match. */
    isPrefix?: boolean;
    /** The module that owns this handler. */
    module: ModuleName;
    /** Execute the button interaction. */
    execute(interaction: ButtonInteraction): Awaitable<void>;
}
/** Handler for a select-menu interaction keyed by custom ID. */
export interface SelectMenuHandler {
    /** The `customId` this handler responds to (exact match or prefix). */
    customId: string;
    /** Whether `customId` should be treated as a prefix rather than an exact match. */
    isPrefix?: boolean;
    /** The module that owns this handler. */
    module: ModuleName;
    /** Execute the select-menu interaction. */
    execute(interaction: AnySelectMenuInteraction): Awaitable<void>;
}
/** Handler for a modal submission keyed by custom ID. */
export interface ModalHandler {
    /** The `customId` this handler responds to (exact match or prefix). */
    customId: string;
    /** Whether `customId` should be treated as a prefix rather than an exact match. */
    isPrefix?: boolean;
    /** The module that owns this handler. */
    module: ModuleName;
    /** Execute the modal-submit interaction. */
    execute(interaction: ModalSubmitInteraction): Awaitable<void>;
}
/** Umbrella type for any component interaction handler. */
export type ComponentHandler = ButtonHandler | SelectMenuHandler | ModalHandler;
