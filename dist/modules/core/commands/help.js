/**
 * /help slash command.
 * Interactive command navigator with category dropdown menus and permissions awareness.
 */
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, ComponentType, } from "discord.js";
import { CORE } from "../../../config/features.js";
import { PermissionLevel } from "../../../types/index.js";
import { Colors } from "../../../utils/embeds.js";
import { FOOTER_TEXT, EMOJIS } from "../../../utils/constants.js";
import { commandHandler } from "../../../handlers/commandHandler.js";
import { moduleLoader } from "../../../handlers/moduleLoader.js";
export const helpCommand = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Explore NEXUS AI commands, features, and operational guides")
        .addStringOption((opt) => opt
        .setName("category")
        .setDescription("Jump straight to a command category")
        .setRequired(false)),
    module: CORE,
    permissions: PermissionLevel.MEMBER,
    cooldownMs: 2000,
    async execute(interaction) {
        const modules = moduleLoader.getAll();
        const commands = Array.from(commandHandler.commands.values());
        const buildOverviewEmbed = () => {
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`${EMOJIS.BOOK} NEXUS AI Operating Guide`)
                .setDescription("Welcome to **NEXUS AI** — the Discord Community Operating System.\n" +
                "Select a subsystem category below using the dropdown menu to inspect available commands and permissions.")
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            for (const mod of modules) {
                const modCmds = commands.filter((c) => c.module === mod.name);
                embed.addFields({
                    name: `${mod.name.toUpperCase()} Subsystem`,
                    value: `${mod.description}\n**Commands:** \`${modCmds.map((c) => `/${c.data.name}`).join(", ") || "None"}\``,
                    inline: false,
                });
            }
            return embed;
        };
        const buildCategoryEmbed = (categoryName) => {
            const mod = moduleLoader.get(categoryName);
            const modCmds = commands.filter((c) => c.module === categoryName);
            const embed = new EmbedBuilder()
                .setColor(Colors.PRIMARY)
                .setTitle(`📖 ${categoryName.toUpperCase()} Module Commands`)
                .setDescription(mod ? mod.description : "Module command list")
                .setFooter({ text: FOOTER_TEXT })
                .setTimestamp();
            if (modCmds.length === 0) {
                embed.addFields({ name: "Commands", value: "No slash commands registered for this module yet." });
            }
            else {
                for (const cmd of modCmds) {
                    const permText = cmd.permissions === PermissionLevel.ADMIN
                        ? "Administrator"
                        : cmd.permissions === PermissionLevel.MODERATOR
                            ? "Moderator"
                            : "Everyone";
                    const desc = "description" in cmd.data ? cmd.data.description : "Context menu command";
                    embed.addFields({
                        name: `/${cmd.data.name}`,
                        value: `${desc || "No description provided."}\n*Required Permission: ${permText}*`,
                        inline: false,
                    });
                }
            }
            return embed;
        };
        const options = [
            {
                label: "Overview",
                description: "General introduction and category index",
                value: "overview",
                emoji: "🌐",
            },
            ...modules.map((m) => ({
                label: m.name.charAt(0).toUpperCase() + m.name.slice(1),
                description: m.description.slice(0, 100),
                value: m.name,
                emoji: "⚙️",
            })),
        ];
        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("help_category_select")
            .setPlaceholder("Select a subsystem category to browse...")
            .addOptions(options);
        const row = new ActionRowBuilder().addComponents(selectMenu);
        const initialReply = await interaction.reply({
            embeds: [buildOverviewEmbed()],
            components: [row],
            fetchReply: true,
        });
        // Create a local collector to handle selections for up to 2 minutes
        const collector = initialReply.createMessageComponentCollector({
            componentType: ComponentType.StringSelect,
            time: 120_000,
            filter: (i) => i.user.id === interaction.user.id,
        });
        collector.on("collect", async (menuInt) => {
            const selected = menuInt.values[0];
            if (selected === "overview") {
                await menuInt.update({ embeds: [buildOverviewEmbed()] });
            }
            else {
                await menuInt.update({ embeds: [buildCategoryEmbed(selected)] });
            }
        });
        collector.on("end", async () => {
            // Remove components when collector times out
            try {
                await interaction.editReply({ components: [] });
            }
            catch {
                // Ignored if message was deleted
            }
        });
    },
};
//# sourceMappingURL=help.js.map