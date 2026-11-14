/**
 * Permission checking utilities for NEXUS AI.
 */
import { PermissionFlagsBits, } from "discord.js";
import { PermissionLevel } from "../types/index.js";
import { config } from "../config/index.js";
/**
 * Resolve the effective permission level of a guild member.
 */
export function getPermissionLevel(member) {
    // Bot owner
    if (member.id === config.discord.clientId) {
        return PermissionLevel.OWNER;
    }
    // Guild owner
    if (member.id === member.guild.ownerId) {
        return PermissionLevel.OWNER;
    }
    // Administrator
    if (member.permissions.has(PermissionFlagsBits.Administrator)) {
        return PermissionLevel.ADMIN;
    }
    // Moderator — ManageMessages or ManageRoles
    if (member.permissions.has(PermissionFlagsBits.ManageMessages) ||
        member.permissions.has(PermissionFlagsBits.ManageRoles) ||
        member.permissions.has(PermissionFlagsBits.KickMembers) ||
        member.permissions.has(PermissionFlagsBits.BanMembers)) {
        return PermissionLevel.MODERATOR;
    }
    return PermissionLevel.MEMBER;
}
/**
 * Check whether an interaction's invoker meets the required permission level.
 */
export function hasPermission(interaction, required) {
    if (required === PermissionLevel.MEMBER)
        return true;
    const member = interaction.member;
    if (!member)
        return false;
    return getPermissionLevel(member) >= required;
}
/**
 * Check if a member has Administrator permission.
 */
export function isAdmin(member) {
    return getPermissionLevel(member) >= PermissionLevel.ADMIN;
}
//# sourceMappingURL=permissions.js.map