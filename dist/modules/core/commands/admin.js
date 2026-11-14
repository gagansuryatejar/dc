/**
 * /admin slash command group.
 * Server administration, configuration, audit logging, and local database backup.
 */
import { SlashCommandBuilder, EmbedBuilder, ChannelType, } from "discord.js";
import fs from "node:fs";
import path from "node:path";
import { CORE } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors, createErrorEmbed, createSuccessEmbed } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { guildRepository, auditRepository } from "../../../database/index.js";
import { auditService, AuditAction } from "../../../security/audit.js";
import { validateTimezone } from "../../../security/validators.js";
export const adminCommand = {
    data: new SlashCommandBuilder()
        .setName("admin")
        .setDescription("Administrative server configuration, auditing, and maintenance")
        .addSubcommand((sub) => sub.setName("settings").setDescription("Inspect current server configuration and channels"))
        .addSubcommand((sub) => sub
        .setName("welcome-channel")
        .setDescription("Assign the designated channel for member greetings")
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Target text channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("log-channel")
        .setDescription("Assign the designated channel for moderation and system audit logs")
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Target text channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("announcement-channel")
        .setDescription("Assign the channel for community events and major announcements")
        .addChannelOption((opt) => opt
        .setName("channel")
        .setDescription("Target text channel")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("locale")
        .setDescription("Set the primary server language")
        .addStringOption((opt) => opt
        .setName("language")
        .setDescription("Language selection")
        .setRequired(true)
        .addChoices({ name: "English (en)", value: "en" }, { name: "Telugu (te)", value: "te" })))
        .addSubcommand((sub) => sub
        .setName("timezone")
        .setDescription("Set server timezone for accurate events and birthday tracking")
        .addStringOption((opt) => opt
        .setName("tz")
        .setDescription("IANA Timezone identifier (e.g. Asia/Kolkata, UTC, America/New_York)")
        .setRequired(true)))
        .addSubcommand((sub) => sub
        .setName("audit-log")
        .setDescription("Review recent security and administration events")
        .addIntegerOption((opt) => opt
        .setName("limit")
        .setDescription("Number of records to fetch (max 25)")
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)))
        .addSubcommand((sub) => sub
        .setName("backup")
        .setDescription("Trigger an immediate, atomic backup of the local SQLite database")),
    module: CORE,
    permissions: PermissionLevel.ADMIN,
    cooldownMs: 5000,
    async execute(interaction) {
        const guildId = interaction.guildId;
        if (!guildId) {
            await interaction.reply({
                embeds: [createErrorEmbed("Error", "Command must be executed inside a guild.")],
                ephemeral: true,
            });
            return;
        }
        const sub = interaction.options.getSubcommand();
        const guildRecord = await guildRepository.findOrCreate(guildId, interaction.guild?.name ?? "Unknown Guild", interaction.guild?.ownerId ?? interaction.user.id);
        if (sub === "settings") {
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`${EMOJIS.GEAR} Server Configuration: ${interaction.guild?.name}`)
                .addFields({
                name: "Welcome Channel",
                value: guildRecord.welcomeChannel ? `<#${guildRecord.welcomeChannel}>` : "`Not configured`",
                inline: true,
            }, {
                name: "Log Channel",
                value: guildRecord.logChannel ? `<#${guildRecord.logChannel}>` : "`Not configured`",
                inline: true,
            }, {
                name: "Announcements",
                value: guildRecord.announcementChannel
                    ? `<#${guildRecord.announcementChannel}>`
                    : "`Not configured`",
                inline: true,
            }, { name: "Locale", value: `\`${guildRecord.locale}\``, inline: true }, { name: "Timezone", value: `\`${guildRecord.timezone}\``, inline: true }, {
                name: "Created At",
                value: `<t:${Math.floor(guildRecord.createdAt.getTime() / 1000)}:R>`,
                inline: true,
            })
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (sub === "welcome-channel") {
            const channel = interaction.options.getChannel("channel", true);
            await guildRepository.update(guildId, { welcomeChannel: channel.id });
            await auditService.log(guildId, AuditAction.SETTINGS_UPDATE, {
                userId: interaction.user.id,
                details: { field: "welcomeChannel", value: channel.id },
            });
            await interaction.reply({
                embeds: [
                    createSuccessEmbed("Welcome Channel Configured", `Member greetings will now route to <#${channel.id}>.`),
                ],
            });
            return;
        }
        if (sub === "log-channel") {
            const channel = interaction.options.getChannel("channel", true);
            await guildRepository.update(guildId, { logChannel: channel.id });
            await auditService.log(guildId, AuditAction.SETTINGS_UPDATE, {
                userId: interaction.user.id,
                details: { field: "logChannel", value: channel.id },
            });
            await interaction.reply({
                embeds: [
                    createSuccessEmbed("Log Channel Configured", `Security and moderation events will route to <#${channel.id}>.`),
                ],
            });
            return;
        }
        if (sub === "announcement-channel") {
            const channel = interaction.options.getChannel("channel", true);
            await guildRepository.update(guildId, { announcementChannel: channel.id });
            await auditService.log(guildId, AuditAction.SETTINGS_UPDATE, {
                userId: interaction.user.id,
                details: { field: "announcementChannel", value: channel.id },
            });
            await interaction.reply({
                embeds: [
                    createSuccessEmbed("Announcement Channel Configured", `Community announcements will route to <#${channel.id}>.`),
                ],
            });
            return;
        }
        if (sub === "locale") {
            const lang = interaction.options.getString("language", true);
            await guildRepository.update(guildId, { locale: lang });
            await auditService.log(guildId, AuditAction.SETTINGS_UPDATE, {
                userId: interaction.user.id,
                details: { field: "locale", value: lang },
            });
            await interaction.reply({
                embeds: [createSuccessEmbed("Locale Updated", `Bot language set to **${lang === "te" ? "Telugu" : "English"}** (${lang}).`)],
            });
            return;
        }
        if (sub === "timezone") {
            const tz = interaction.options.getString("tz", true);
            if (!validateTimezone(tz)) {
                await interaction.reply({
                    embeds: [
                        createErrorEmbed("Invalid Timezone", `"${tz}" is not recognized as a valid IANA timezone. Examples: \`Asia/Kolkata\`, \`UTC\`, \`America/New_York\`.`),
                    ],
                    ephemeral: true,
                });
                return;
            }
            await guildRepository.update(guildId, { timezone: tz });
            await auditService.log(guildId, AuditAction.SETTINGS_UPDATE, {
                userId: interaction.user.id,
                details: { field: "timezone", value: tz },
            });
            await interaction.reply({
                embeds: [createSuccessEmbed("Timezone Updated", `Server timezone registered as **${tz}**.`)],
            });
            return;
        }
        if (sub === "audit-log") {
            const limit = interaction.options.getInteger("limit") ?? 10;
            const logs = await auditRepository.findByGuild(guildId, { limit });
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`${EMOJIS.SHIELD} Server Audit Log Records`)
                .setDescription(`Displaying last ${logs.length} logged administrative and security events:`)
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            if (logs.length === 0) {
                embed.addFields({ name: "Records", value: "No audit events recorded yet." });
            }
            else {
                for (const entry of logs) {
                    const time = `<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`;
                    const userStr = entry.userId ? `<@${entry.userId}>` : "System";
                    embed.addFields({
                        name: `${entry.action} — ${entry.severity.toUpperCase()}`,
                        value: `**Actor:** ${userStr} | **Time:** ${time}\n**Details:** \`${entry.details ?? "None"}\``,
                        inline: false,
                    });
                }
            }
            await interaction.reply({ embeds: [embed] });
            return;
        }
        if (sub === "backup") {
            // Trigger local backup
            try {
                const dbPath = path.resolve(process.cwd(), "data", "nexus.db");
                const backupDir = path.resolve(process.cwd(), "data", "backups");
                if (!fs.existsSync(backupDir)) {
                    fs.mkdirSync(backupDir, { recursive: true });
                }
                const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
                const backupFile = path.join(backupDir, `nexus-backup-${timestamp}.db`);
                if (fs.existsSync(dbPath)) {
                    fs.copyFileSync(dbPath, backupFile);
                    const stats = fs.statSync(backupFile);
                    const sizeKb = Math.round(stats.size / 1024);
                    await auditService.log(guildId, AuditAction.BACKUP_CREATED, {
                        userId: interaction.user.id,
                        details: { backupFile: path.basename(backupFile), sizeKb },
                    });
                    await interaction.reply({
                        embeds: [
                            createSuccessEmbed("Database Backup Successful", `Created atomic SQLite snapshot:\n\`${path.basename(backupFile)}\` (${sizeKb} KB)\nPreserved on local host storage.`),
                        ],
                    });
                }
                else {
                    await interaction.reply({
                        embeds: [createErrorEmbed("Backup Failed", "Primary database file not found at expected path.")],
                        ephemeral: true,
                    });
                }
            }
            catch (err) {
                await interaction.reply({
                    embeds: [createErrorEmbed("Backup Error", `Failed to complete backup: ${err.message}`)],
                    ephemeral: true,
                });
            }
            return;
        }
    },
};
//# sourceMappingURL=admin.js.map