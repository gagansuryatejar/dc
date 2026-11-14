/**
 * Permission checking utilities for NEXUS AI.
 */
import { type ChatInputCommandInteraction, type GuildMember } from "discord.js";
import { PermissionLevel } from "../types/index.js";
/**
 * Resolve the effective permission level of a guild member.
 */
export declare function getPermissionLevel(member: GuildMember): PermissionLevel;
/**
 * Check whether an interaction's invoker meets the required permission level.
 */
export declare function hasPermission(interaction: ChatInputCommandInteraction, required: PermissionLevel): boolean;
/**
 * Check if a member has Administrator permission.
 */
export declare function isAdmin(member: GuildMember): boolean;
