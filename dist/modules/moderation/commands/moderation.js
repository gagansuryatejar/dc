/**
 * Moderation Slash Commands for NEXUS AI.
 * Handles manual enforcement: /warn, /timeout, /untimeout, /kick, /ban, /unban,
 * and /mod management: history, pardon, filter rules, and raid shield controls.
 */
import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, } from "discord.js";
import { punishmentService } from "../services/punishment.service.js";
import { automodService } from "../services/automod.service.js";
import { prisma } from "../../../database/index.js";
import { FOOTER_TEXT } from "../../../utils/constants.js";
import { Colors } from "../../../utils/embeds.js";
import { sanitizeString, validateSnowflake } from "../../../security/validators.js";
import { PermissionLevel } from "../../../types/index.js";
import { MODERATION } from "../../../config/features.js";
// ── 1. /warn Command ────────────────────────────────────────
export const warnCommand = {
    data: new SlashCommandBuilder()
        .setName("warn")
        .setDescription("Issue an official warning to a server member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((opt) => opt.setName("user").setDescription("The member to warn").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the warning").setRequired(true)),
    module: MODERATION,
    permissions: PermissionLevel.MODERATOR,
    cooldownMs: 3000,
    async execute(interaction) {
        const targetUser = interaction.options.getUser("user", true);
        const reason = sanitizeString(interaction.options.getString("reason", true), 500);
        const guildId = interaction.guildId;
        if (targetUser.id === interaction.user.id) {
            await interaction.reply({ content: "❌ You cannot warn yourself.", ephemeral: true });
            return;
        }
        const { infraction, escalation } = await punishmentService.recordInfraction(guildId, targetUser.id, interaction.user.id, "warn", reason);
        const embed = new EmbedBuilder()
            .setColor(Colors.WARNING)
            .setTitle("⚠️ Official Warning Issued")
            .setDescription(`**Member:** <@${targetUser.id}> (${targetUser.tag})\n` +
            `**Moderator:** <@${interaction.user.id}>\n` +
            `**Reason:** ${reason}\n` +
            `**Infraction ID:** \`${infraction.id}\`\n\n` +
            `**Active Warnings:** ${escalation.warningsCount}\n` +
            (escalation.action === "timeout"
                ? `🚨 **Escalation Triggered:** Member should be timed out for ${escalation.durationMinutes} minutes.`
                : `*Next escalation tier will trigger a timeout.*`))
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
// ── 2. /timeout Command ─────────────────────────────────────
export const timeoutCommand = {
    data: new SlashCommandBuilder()
        .setName("timeout")
        .setDescription("Temporarily timeout (mute) a server member")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((opt) => opt.setName("user").setDescription("The member to timeout").setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("duration")
        .setDescription("Duration of the timeout in minutes")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the timeout").setRequired(false)),
    module: MODERATION,
    permissions: PermissionLevel.MODERATOR,
    cooldownMs: 3000,
    async execute(interaction) {
        const targetUser = interaction.options.getUser("user", true);
        const duration = interaction.options.getInteger("duration", true);
        const reason = sanitizeString(interaction.options.getString("reason") || "No reason specified", 500);
        const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            await interaction.reply({ content: "❌ Member not found in this guild.", ephemeral: true });
            return;
        }
        if (!targetMember.moderatable) {
            await interaction.reply({
                content: "❌ I cannot timeout this user (they may have higher roles or administrative permissions).",
                ephemeral: true,
            });
            return;
        }
        await punishmentService.applyTimeout(targetMember, duration, reason, interaction.user.id);
        const embed = new EmbedBuilder()
            .setColor(Colors.ERROR)
            .setTitle("⏳ Member Timed Out")
            .setDescription(`**Member:** <@${targetUser.id}>\n` +
            `**Duration:** ${duration} minute(s)\n` +
            `**Moderator:** <@${interaction.user.id}>\n` +
            `**Reason:** ${reason}`)
            .setFooter({ text: FOOTER_TEXT })
            .setTimestamp();
        await interaction.reply({ embeds: [embed] });
    },
};
// ── 3. /untimeout Command ───────────────────────────────────
export const untimeoutCommand = {
    data: new SlashCommandBuilder()
        .setName("untimeout")
        .setDescription("Remove timeout from a member early")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((opt) => opt.setName("user").setDescription("The member to untimeout").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for removing timeout").setRequired(false)),
    module: MODERATION,
    permissions: PermissionLevel.MODERATOR,
    cooldownMs: 3000,
    async execute(interaction) {
        const targetUser = interaction.options.getUser("user", true);
        const reason = sanitizeString(interaction.options.getString("reason") || "Early release by moderator", 500);
        const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            await interaction.reply({ content: "❌ Member not found.", ephemeral: true });
            return;
        }
        await punishmentService.removeTimeout(targetMember, reason, interaction.user.id);
        await interaction.reply({
            content: `✅ Removed timeout from <@${targetUser.id}>. Reason: ${reason}`,
        });
    },
};
// ── 4. /kick Command ────────────────────────────────────────
export const kickCommand = {
    data: new SlashCommandBuilder()
        .setName("kick")
        .setDescription("Kick a member from the server")
        .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
        .addUserOption((opt) => opt.setName("user").setDescription("The member to kick").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for kicking").setRequired(false)),
    module: MODERATION,
    permissions: PermissionLevel.MODERATOR,
    cooldownMs: 5000,
    async execute(interaction) {
        const targetUser = interaction.options.getUser("user", true);
        const reason = sanitizeString(interaction.options.getString("reason") || "Kicked by moderator", 500);
        const targetMember = await interaction.guild?.members.fetch(targetUser.id).catch(() => null);
        if (!targetMember) {
            await interaction.reply({ content: "❌ Member not found.", ephemeral: true });
            return;
        }
        if (!targetMember.kickable) {
            await interaction.reply({
                content: "❌ I do not have permission to kick this member.",
                ephemeral: true,
            });
            return;
        }
        await punishmentService.kickMember(targetMember, reason, interaction.user.id);
        await interaction.reply({
            content: `👢 **Kicked <@${targetUser.id}> (${targetUser.tag})**. Reason: ${reason}`,
        });
    },
};
// ── 5. /ban & /unban Commands ───────────────────────────────
export const banCommand = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Permanently ban a user from the server")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((opt) => opt.setName("user").setDescription("The user to ban").setRequired(true))
        .addIntegerOption((opt) => opt
        .setName("delete_days")
        .setDescription("Number of days of message history to delete (0-7)")
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for the ban").setRequired(false)),
    module: MODERATION,
    permissions: PermissionLevel.ADMIN,
    cooldownMs: 5000,
    async execute(interaction) {
        const targetUser = interaction.options.getUser("user", true);
        const deleteDays = interaction.options.getInteger("delete_days") || 0;
        const reason = sanitizeString(interaction.options.getString("reason") || "Banned by moderator", 500);
        if (!interaction.guild)
            return;
        await punishmentService.banUser(interaction.guild, targetUser.id, reason, interaction.user.id, deleteDays);
        await interaction.reply({
            content: `🔨 **Banned <@${targetUser.id}> (${targetUser.tag})**. Reason: ${reason} (Messages pruned: ${deleteDays}d)`,
        });
    },
};
export const unbanCommand = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Unban a user by their Discord user ID")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((opt) => opt.setName("user_id").setDescription("The Discord Snowflake user ID to unban").setRequired(true))
        .addStringOption((opt) => opt.setName("reason").setDescription("Reason for unbanning").setRequired(false)),
    module: MODERATION,
    permissions: PermissionLevel.ADMIN,
    cooldownMs: 5000,
    async execute(interaction) {
        const userId = interaction.options.getString("user_id", true).trim();
        const reason = sanitizeString(interaction.options.getString("reason") || "Pardoned by moderator", 500);
        if (!validateSnowflake(userId)) {
            await interaction.reply({ content: "❌ Invalid Discord User ID.", ephemeral: true });
            return;
        }
        if (!interaction.guild)
            return;
        await punishmentService.unbanUser(interaction.guild, userId, reason, interaction.user.id);
        await interaction.reply({
            content: `✅ **Unbanned user ID \`${userId}\`**. Reason: ${reason}`,
        });
    },
};
// ── 6. /mod Command Group ───────────────────────────────────
export const modCommand = {
    data: new SlashCommandBuilder()
        .setName("mod")
        .setDescription("Moderation administration, history, filters, and raid shields")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addSubcommand((sub) => sub
        .setName("history")
        .setDescription("View moderation infraction history for a member")
        .addUserOption((opt) => opt.setName("user").setDescription("The member whose history to view").setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("pardon")
        .setDescription("Pardon an active warning infraction")
        .addStringOption((opt) => opt.setName("infraction_id").setDescription("The Infraction ID to pardon").setRequired(true)))
        .addSubcommandGroup((grp) => grp
        .setName("filter")
        .setDescription("Manage automated word filter rules")
        .addSubcommand((sub) => sub
        .setName("add")
        .setDescription("Add a banned word or pattern to filter")
        .addStringOption((opt) => opt.setName("pattern").setDescription("Word or regex pattern").setRequired(true))
        .addStringOption((opt) => opt
        .setName("action")
        .setDescription("Action when triggered")
        .addChoices({ name: "Delete & Warn", value: "delete_warn" }, { name: "Timeout (10m)", value: "timeout" }, { name: "Delete Silently", value: "delete" })
        .setRequired(false))
        .addBooleanOption((opt) => opt.setName("is_regex").setDescription("Treat pattern as regex").setRequired(false)))
        .addSubcommand((sub) => sub.setName("list").setDescription("List all active filter rules"))
        .addSubcommand((sub) => sub
        .setName("remove")
        .setDescription("Remove a pattern from the filter")
        .addStringOption((opt) => opt.setName("pattern").setDescription("The pattern to remove").setRequired(true))))
        .addSubcommand((sub) => sub
        .setName("raidshield")
        .setDescription("Toggle server raid shield lockdown status")
        .addStringOption((opt) => opt
        .setName("status")
        .setDescription("Turn raid shield ON or OFF")
        .addChoices({ name: "ON (Lockdown)", value: "on" }, { name: "OFF (Normal)", value: "off" })
        .setRequired(true))),
    module: MODERATION,
    permissions: PermissionLevel.MODERATOR,
    cooldownMs: 3000,
    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup(false);
        const sub = interaction.options.getSubcommand();
        const guildId = interaction.guildId;
        // ── /mod history ──────────────────────────────────────────
        if (!group && sub === "history") {
            const user = interaction.options.getUser("user", true);
            const history = await punishmentService.getHistory(guildId, user.id);
            if (history.length === 0) {
                await interaction.reply({
                    content: `ℹ️ No infractions recorded for <@${user.id}>. Clean record!`,
                    ephemeral: true,
                });
                return;
            }
            const activeWarnings = history.filter((h) => h.type === "warn" && h.active).length;
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`🛡️ Infraction History — ${user.tag}`)
                .setDescription(`**Total Infractions:** ${history.length} | **Active Warnings:** ${activeWarnings}\n\n` +
                history
                    .slice(0, 10)
                    .map((h) => `• \`${h.id}\` **[${h.type.toUpperCase()}]** — ${h.reason}\n` +
                    `  *Moderator: <@${h.moderatorId}> | Status: ${h.active ? "🟢 Active" : "⚪ Pardoned"} | <t:${Math.floor(h.createdAt.getTime() / 1000)}:R>*`)
                    .join("\n\n"))
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }
        // ── /mod pardon ───────────────────────────────────────────
        if (!group && sub === "pardon") {
            const infractionId = interaction.options.getString("infraction_id", true).trim();
            const success = await punishmentService.pardonInfraction(guildId, infractionId, interaction.user.id);
            if (!success) {
                await interaction.reply({
                    content: `❌ Could not find an active infraction with ID \`${infractionId}\`.`,
                    ephemeral: true,
                });
                return;
            }
            await interaction.reply({
                content: `✅ Infraction \`${infractionId}\` has been pardoned and active warning tally adjusted.`,
            });
            return;
        }
        // ── /mod filter ───────────────────────────────────────────
        if (group === "filter") {
            if (sub === "add") {
                const pattern = sanitizeString(interaction.options.getString("pattern", true).trim(), 64);
                const action = interaction.options.getString("action") || "delete_warn";
                const isRegex = interaction.options.getBoolean("is_regex") || false;
                await prisma.filterRule.upsert({
                    where: { guildId_pattern: { guildId, pattern } },
                    update: { action, isRegex, enabled: true },
                    create: { guildId, pattern, action, isRegex, enabled: true },
                });
                await interaction.reply({
                    content: `✅ Prohibited pattern added: \`${pattern}\` (Action: **${action}**, Regex: **${isRegex}**)`,
                });
                return;
            }
            if (sub === "list") {
                const rules = await prisma.filterRule.findMany({
                    where: { guildId },
                    orderBy: { createdAt: "desc" },
                });
                if (rules.length === 0) {
                    await interaction.reply({
                        content: "ℹ️ No custom word filter rules currently configured for this server.",
                        ephemeral: true,
                    });
                    return;
                }
                const embed = new EmbedBuilder()
                    .setColor(Colors.PRIMARY)
                    .setTitle("🛡️ Active Word Filter Rules")
                    .setDescription(rules
                    .map((r) => `• \`${r.pattern}\` — Action: **${r.action}** | Regex: **${r.isRegex}** | Active: **${r.enabled}**`)
                    .join("\n"))
                    .setFooter({ text: FOOTER_TEXT });
                await interaction.reply({ embeds: [embed] });
                return;
            }
            if (sub === "remove") {
                const pattern = sanitizeString(interaction.options.getString("pattern", true).trim(), 64);
                try {
                    await prisma.filterRule.delete({
                        where: { guildId_pattern: { guildId, pattern } },
                    });
                    await interaction.reply({ content: `✅ Removed pattern \`${pattern}\` from server filter.` });
                }
                catch {
                    await interaction.reply({ content: `❌ Pattern \`${pattern}\` was not found.`, ephemeral: true });
                }
                return;
            }
        }
        // ── /mod raidshield ───────────────────────────────────────
        if (!group && sub === "raidshield") {
            const status = interaction.options.getString("status", true);
            const enabled = status === "on";
            automodService.setRaidShield(guildId, enabled);
            await interaction.reply({
                content: enabled
                    ? "🚨 **RAID SHIELD ACTIVATED**: Lockdown mode enabled. New member joins will be scrutinized and flagged."
                    : "✅ **RAID SHIELD DEACTIVATED**: Server returned to standard monitoring mode.",
            });
            return;
        }
    },
};
//# sourceMappingURL=moderation.js.map